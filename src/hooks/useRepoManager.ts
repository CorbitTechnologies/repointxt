import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  shouldIgnore,
  estimateTokens,
  smartSelectFiles,
  chunkFilesByTokenLimit,
} from '../utils/fileHelpers';
import { optimizeContent, detectBoundary } from '../utils/textOptimizer';
import { DEFAULT_IGNORE_PATTERNS } from '../utils/constants';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';
import { parseGitHubSlug, fetchTreeData, fetchRepoZipball, fetchFileContent, clearRepoZipCache, clearAllRepoZipCaches, sanitizeArchivePath } from '../services/githubService';
import { trackEvent, measurePerformance, logCrash } from '../services/firebase';
import { Source, FileItem, PromptBatch, ProcessingOptionsState } from '../types';

const defaultOptions: ProcessingOptionsState = {
  removeComments: false,
  removeExtraWhitespace: true,
  maxContextTokens: 200000,
  maxFileSize: 250,
  ignorePatterns: DEFAULT_IGNORE_PATTERNS.join(', '),
  outputFormat: 'xml',
};

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });

  await Promise.all(workers);
  return results;
}

export const useRepoManager = () => {
  const initialSettings = useMemo(() => loadAppSettings() || {}, []);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearErrorMessage = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const [options, setOptions] = useState<ProcessingOptionsState>(() => ({
    removeComments: initialSettings.removeComments !== undefined ? initialSettings.removeComments : defaultOptions.removeComments,
    removeExtraWhitespace: initialSettings.removeExtraWhitespace !== undefined ? initialSettings.removeExtraWhitespace : defaultOptions.removeExtraWhitespace,
    maxContextTokens: initialSettings.maxContextTokens !== undefined ? initialSettings.maxContextTokens : defaultOptions.maxContextTokens,
    maxFileSize: initialSettings.maxFileSize !== undefined ? Number(initialSettings.maxFileSize) : defaultOptions.maxFileSize,
    ignorePatterns: initialSettings.ignorePatterns || defaultOptions.ignorePatterns,
    outputFormat: initialSettings.outputFormat || defaultOptions.outputFormat,
  }));

  const [activeTab, setActiveTab] = useState<string>(
    initialSettings.activeTab || 'github'
  );

  const [sources, setSources] = useState<Source[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubToken, setGithubToken] = useState(() => loadGitHubToken() || '');
  const [githubRateLimit, setGithubRateLimit] = useState<{ remaining: number; limit: number } | null>(null);
  const [urlHistory, setUrlHistory] = useState<string[]>(() => loadUrlHistory() || []);
  const [outputBatches, setOutputBatches] = useState<PromptBatch[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const blobUrlsRef = useRef<string[]>([]);
  const isFirstRender = useRef(true);
  const packWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.Worker) {
        packWorkerRef.current = new Worker(new URL('../workers/packWorker.ts', import.meta.url), { type: 'module' });
      }
    } catch (e) {
      console.warn('Worker initialization failed, fallback to main thread:', e);
    }
    return () => {
      packWorkerRef.current?.terminate();
    };
  }, []);

  const updateOption = <K extends keyof ProcessingOptionsState>(key: K, value: ProcessingOptionsState[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const createTrackedBlobUrl = useCallback((file: Blob | File) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) {}
      });
      blobUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    saveAppSettings({
      ...options,
      activeTab
    });
    saveGitHubToken(githubToken);
  }, [options, activeTab, githubToken]);

  const normalizeFileItem = (item: FileItem, source: Source, multiSource: boolean): FileItem => {
    const origPath = item.originalPath || item.path;
    return {
      ...item,
      originalPath: origPath,
      path: multiSource ? `${source.name}/${origPath}` : origPath,
      sourceId: source.id,
      sourceOwner: source.owner,
      sourceRepo: source.repo,
      sourceBranch: source.branch,
    };
  };

  const treeData = useMemo(() => {
    const multi = sources.length > 1;
    const allItems: FileItem[] = [];
    sources.forEach(source => {
      source.tree.forEach((item) => {
        allItems.push(normalizeFileItem(item, source, multi));
      });
    });
    return allItems.length > 0 ? { tree: allItems } : null;
  }, [sources]);

  const selectedFiles = useMemo(() => {
    const multi = sources.length > 1;
    const allSelected: FileItem[] = [];
    sources.forEach(source => {
      source.selectedFiles.forEach((file) => {
        allSelected.push(normalizeFileItem(file, source, multi));
      });
    });
    return allSelected;
  }, [sources]);

  const setSelectedFiles = useCallback((updater: any) => {
    setSources(prev => {
      const multi = prev.length > 1;
      const currentFlat: FileItem[] = [];
      prev.forEach(s => s.selectedFiles.forEach((f) => {
        currentFlat.push(normalizeFileItem(f, s, multi));
      }));
      const nextFlat = typeof updater === 'function' ? updater(currentFlat) : updater;
      const grouped: Record<string, FileItem[]> = {};
      nextFlat.forEach((f: FileItem) => {
        if (!grouped[f.sourceId]) grouped[f.sourceId] = [];
        const origPath = f.originalPath || f.path;
        grouped[f.sourceId].push({
          ...f,
          originalPath: origPath,
          path: origPath
        });
      });
      return prev.map(s => ({ ...s, selectedFiles: grouped[s.id] || [] }));
    });
  }, []);

  const fetchGitHubRepo = useCallback(async (isAdding = false, targetUrl?: string) => {
    const urlToFetch = (targetUrl !== undefined ? targetUrl : githubUrl).trim();
    if (!urlToFetch) {
      setErrorMessage('Please enter a valid GitHub repository URL or slug (e.g. facebook/react).');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    setLoadingMessage('Scanning repository tree...');
    if (!isAdding) {
      clearAllRepoZipCaches();
      setSources([]);
      setOutputBatches([]);
    }

    trackEvent('scan_repo_start', { isPublic: !githubToken });

    const targetSourceId = `gh-${Date.now()}`;

    try {
      const { owner, repo } = parseGitHubSlug(urlToFetch);
      const { branch: activeBranch, tree } = await measurePerformance('github_repo_ingest', async () => {
        try {
          setLoadingMessage('Streaming repository archive...');
          return await fetchRepoZipball(
            owner,
            repo,
            githubBranch.trim(),
            githubToken,
            (rem, lim) => setGithubRateLimit({ remaining: rem, limit: lim }),
            targetSourceId
          );
        } catch (zipErr) {
          console.warn('Zipball ingestion failed, falling back to REST Git Tree API:', zipErr);
          setLoadingMessage('Scanning repository tree...');
          return await fetchTreeData(
            owner,
            repo,
            githubBranch.trim(),
            githubToken,
            (rem, lim) => setGithubRateLimit({ remaining: rem, limit: lim }),
            targetSourceId
          );
        }
      });

      const maxBytes = Number(options.maxFileSize) * 1024;
      const validTreeItems: FileItem[] = tree.filter((i: any) => {
        if (i.type !== 'blob') return false;
        if (shouldIgnore(i.path, options.ignorePatterns)) return false;
        if (typeof i.size === 'number' && i.size > maxBytes) return false;
        return true;
      }).map((i: any) => ({
        ...i,
        originalPath: i.path,
        sourceId: targetSourceId
      }));

      const newSource: Source = {
        id: targetSourceId,
        type: 'github',
        name: repo,
        owner,
        repo,
        branch: activeBranch,
        tree: validTreeItems,
        selectedFiles: smartSelectFiles(validTreeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      setGithubUrl('');
      saveUrlToHistory(urlToFetch);
      setUrlHistory(loadUrlHistory());
      trackEvent('scan_repo_success', { fileCount: validTreeItems.length });

      // Synchronize browser URL bar with pushState for history & deep linking
      if (typeof window !== 'undefined' && !isAdding) {
        const slug = `${owner}/${repo}`;
        if (!window.location.pathname.includes(slug)) {
          const currentParams = window.location.search;
          window.history.pushState({ slug }, '', `/${slug}${currentParams}`);
        }
      }
    } catch (e: any) {
      logCrash(e, false, { context: 'fetchGitHubRepo' });
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [githubUrl, githubBranch, githubToken, options.ignorePatterns, options.maxFileSize]);

  // Direct Hook Auto-Ingestion for URL slug (e.g. repointxt.corbit.tech/owner/repo) and ?model= parameter
  const autoIngestAttemptedRef = useRef(false);

  const parseAndIngestUrl = useCallback((isInitial = false) => {
    if (typeof window === 'undefined') return;
    try {
      // 1. Handle Query Parameters (e.g. ?model=claude or ?model=gemini, &stripComments=)
      const urlParams = new URLSearchParams(window.location.search);
      const targetModel = urlParams.get('model')?.toLowerCase();
      const stripCommentsParam = urlParams.get('stripComments');

      if (targetModel === 'claude' || targetModel === 'claude3' || targetModel === 'claude-3-5' || targetModel === 'claude-3-7') {
        setOptions(prev => ({ ...prev, maxContextTokens: 200000 }));
      } else if (targetModel === 'gemini2m' || targetModel === 'gemini-2m' || targetModel === 'aistudio') {
        setOptions(prev => ({ ...prev, maxContextTokens: 2000000 }));
      } else if (targetModel === 'gemini' || targetModel === 'gemini-1.5' || targetModel === 'gemini-2.0') {
        setOptions(prev => ({ ...prev, maxContextTokens: 1000000 }));
      } else if (targetModel === 'gpt4o' || targetModel === 'gpt4' || targetModel === 'chatgpt' || targetModel === 'o1' || targetModel === 'o3-mini') {
        setOptions(prev => ({ ...prev, maxContextTokens: 128000 }));
      }

      if (stripCommentsParam !== null) {
        setOptions(prev => ({ ...prev, removeComments: stripCommentsParam === 'true' }));
      }

      // 2. Handle URL Slug Ingestion:
      const rawPath = decodeURIComponent(window.location.pathname);
      const cleanPath = rawPath
        .replace(/^\/+(https?:\/+(www\.)?)?/i, '')
        .replace(/^github\.com\//i, '')
        .replace(/\/+$/, '');

      const repoSlugMatch = cleanPath.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);

      if (
        repoSlugMatch &&
        !repoSlugMatch[0].startsWith('assets') &&
        !repoSlugMatch[0].startsWith('static') &&
        !repoSlugMatch[0].startsWith('tools') &&
        !repoSlugMatch[0].startsWith('alternatives')
      ) {
        const slug = `${repoSlugMatch[1]}/${repoSlugMatch[2]}`;
        document.title = `Pack ${slug} into LLM Context | repointxt`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute(
            'content',
            `Generate token-optimized prompt bundles for ${slug}. In-browser client-side packing for Claude, Gemini, and ChatGPT.`
          );
        }
        setGithubUrl(slug);
        setActiveTab('github');
        fetchGitHubRepo(false, slug);
      } else if (!isInitial && cleanPath === '') {
        setSources([]);
        setOutputBatches([]);
      }
    } catch (_) {}
  }, [fetchGitHubRepo]);

  useEffect(() => {
    if (autoIngestAttemptedRef.current) return;
    autoIngestAttemptedRef.current = true;
    parseAndIngestUrl(true);

    const handlePopState = () => {
      parseAndIngestUrl(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseAndIngestUrl]);

  const pickLocalDirectory = useCallback(async (isAdding = false) => {
    if (!(window as any).showDirectoryPicker) {
      return window.alert("Directory picker is not supported in this browser. Please use 'Select Files' or Drag & Drop.");
    }
    setLoading(true);
    setLoadingMessage('Scanning directory...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const handle = await (window as any).showDirectoryPicker();
      const files: any[] = [];

      const read = async (dirHandle: any, path = '') => {
        for await (const entry of dirHandle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          if (entry.kind === 'directory') {
            if (!shouldIgnore(entryPath, options.ignorePatterns)) {
              await read(entry, entryPath);
            }
          } else if (entry.kind === 'file') {
            if (!shouldIgnore(entryPath, options.ignorePatterns)) {
              const fileObj = await entry.getFile();
              if (fileObj.size <= Number(options.maxFileSize) * 1024) {
                files.push({
                  path: entryPath,
                  originalPath: entryPath,
                  size: fileObj.size,
                  file: fileObj
                });
              }
            }
          }
        }
      };

      await read(handle);

      const sourceId = `loc-${Date.now()}`;
      const treeItems: FileItem[] = files.map((f, i) => ({
        ...f,
        type: 'blob' as const,
        sha: `loc-${Date.now()}-${i}`,
        sourceId
      }));

      const newSource: Source = {
        id: sourceId,
        type: 'local',
        name: handle.name,
        tree: treeItems,
        selectedFiles: smartSelectFiles(treeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [options.ignorePatterns, options.maxFileSize]);

  const pickLocalFiles = useCallback(async (isAdding = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e: any) => {
      setLoading(true);
      setLoadingMessage('Loading files...');
      if (!isAdding) { setSources([]); setOutputBatches([]); }

      try {
        const selected = Array.from(e.target.files || []) as File[];
        const sourceId = `files-${Date.now()}`;
        const files: FileItem[] = selected
          .filter(f => !shouldIgnore(f.name, options.ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            originalPath: f.name,
            type: 'blob',
            size: f.size,
            file: f,
            sha: `file-${Date.now()}-${i}`,
            sourceId
          }));

        const newSource: Source = {
          id: sourceId,
          type: 'local',
          name: 'Files Batch',
          tree: files,
          selectedFiles: smartSelectFiles(files)
        };

        setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };
    input.click();
  }, [options.ignorePatterns, createTrackedBlobUrl]);

  const generateText = useCallback(async () => {
    if (sources.length === 0 || selectedFiles.length === 0) return;
    const startTime = performance.now();
    setLoading(true);
    setLoadingMessage('Optimizing context bundles...');

    trackEvent('generate_bundle_start', {
      sourceCount: sources.length,
      selectedCount: selectedFiles.length,
    });

    try {
      const allFiles: FileItem[] = [];
      for (const s of sources) {
        if (!s.selectedFiles || s.selectedFiles.length === 0) continue;
        allFiles.push(...s.selectedFiles.map((f) => {
          const origPath = f.originalPath || f.path;
          return {
            ...f,
            originalPath: origPath,
            path: sources.length > 1 ? `${s.name}/${origPath}` : origPath,
            sourceName: s.name,
            sourceType: s.type,
            sourceOwner: s.owner,
            sourceRepo: s.repo,
            sourceBranch: s.branch
          };
        }));
      }

      const fileBatches = chunkFilesByTokenLimit(allFiles, options.maxContextTokens);
      const generatedBatches: PromptBatch[] = [];
      const timestamp = new Date().toISOString();

      // Framework & Architecture Topology Generator
      const buildTopologySummary = (files: FileItem[]): string => {
        const paths = files.map(f => f.path);
        const frameworks: string[] = [];
        const tags: string[] = [];

        // Stack Detection
        const hasNext = paths.some(p => p.includes('next.config') || p.startsWith('app/') || p.includes('/app/'));
        const hasFlutter = paths.some(p => p.endsWith('pubspec.yaml') || p.endsWith('.dart'));
        const hasSupabase = paths.some(p => p.includes('supabase/'));
        const hasFirebase = paths.some(p => p.includes('firestore.rules') || p.includes('firebase.json'));
        const hasTurbo = paths.some(p => p.includes('turbo.json') || p.includes('pnpm-workspace.yaml'));

        if (hasTurbo) frameworks.push('Turborepo Monorepo');
        if (hasNext) frameworks.push('Next.js (App Router)');
        if (hasFlutter) frameworks.push('Flutter / Dart');
        if (hasSupabase) frameworks.push('Supabase BaaS');
        if (hasFirebase) frameworks.push('Firebase BaaS');

        // Next.js Route Map Generator
        if (hasNext) {
          const routes = paths
            .filter(p => /(?:^|\/)app\/.*page\.(tsx|jsx|js|ts)$/.test(p))
            .map(p => '      • /' + p.replace(/^.*?(?:^|\/)app\/?/, '').replace(/\/page\.[^.]+$/, '').replace(/\(.*?\)\/?/g, ''))
            .filter(Boolean);
          if (routes.length > 0) {
            tags.push(`    <route_map>\n${routes.join('\n')}\n    </route_map>`);
          }
        }

        // Flutter & Mobile Native Module Summary
        if (hasFlutter) {
          const hasIos = paths.some(p => p.startsWith('ios/') || p.includes('/ios/'));
          const hasAndroid = paths.some(p => p.startsWith('android/') || p.includes('/android/'));
          const libFiles = paths.filter(p => p.startsWith('lib/') || p.includes('/lib/'));
          tags.push(`    <flutter_info dart_files="${libFiles.length}" ios_configured="${hasIos}" android_configured="${hasAndroid}" />`);
        }

        // Supabase Table Summary
        if (hasSupabase) {
          const migrationFiles = paths.filter(p => p.includes('supabase/migrations/'));
          tags.push(`    <supabase_info migrations="${migrationFiles.length}" rls_enabled="true" />`);
        }

        // Firebase Rules Reference
        if (hasFirebase) {
          tags.push(`    <firebase_info security_rules_included="${paths.some(p => p.includes('.rules'))}" />`);
        }

        return `  <framework_topology detected="${frameworks.join(', ') || 'Standard'}" count="${files.length}">\n${tags.join('\n')}\n  </framework_topology>`;
      };

      const topologyXml = buildTopologySummary(allFiles);

      // ASCII Visual Directory Tree Generator
      const buildAsciiDirectoryTree = (files: FileItem[]): string => {
        interface TreeNode {
          dirs: Map<string, TreeNode>;
          files: string[];
        }
        const root: TreeNode = { dirs: new Map(), files: [] };

        for (const f of files) {
          const parts = f.path.split('/');
          let curr = root;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!curr.dirs.has(part)) {
              curr.dirs.set(part, { dirs: new Map(), files: [] });
            }
            curr = curr.dirs.get(part)!;
          }
          curr.files.push(parts[parts.length - 1]);
        }

        const lines: string[] = [];
        const renderNode = (node: TreeNode, prefix: string) => {
          const dirEntries = Array.from(node.dirs.entries()).sort((a, b) => a[0].localeCompare(b[0]));
          const sortedFiles = [...node.files].sort((a, b) => a.localeCompare(b));
          const totalEntries = dirEntries.length + sortedFiles.length;
          let count = 0;

          for (const [dirName, childNode] of dirEntries) {
            count++;
            const isLast = count === totalEntries;
            const branch = isLast ? '└── ' : '├── ';
            lines.push(`${prefix}${branch}${dirName}/`);
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            renderNode(childNode, nextPrefix);
          }

          for (const fileName of sortedFiles) {
            count++;
            const isLast = count === totalEntries;
            const branch = isLast ? '└── ' : '├── ';
            lines.push(`${prefix}${branch}${fileName}`);
          }
        };

        renderNode(root, '');
        return lines.join('\n');
      };

      const asciiTree = buildAsciiDirectoryTree(allFiles);

      // Build File Tree Manifest string for the top of the prompt
      const treeManifest = allFiles
        .map(f => `    • ${f.path} (~${Math.ceil((f.size || 0) / 3.8)} tokens)`)
        .join('\n');

      for (let bIndex = 0; bIndex < fileBatches.length; bIndex++) {
        const batchFiles = fileBatches[bIndex];
        const isMultiPart = fileBatches.length > 1;
        const parts: string[] = [];
        const isMarkdown = options.outputFormat === 'markdown';

        if (isMarkdown) {
          parts.push(`# Repository Context: ${sources.map(s => s.name).join(', ')}`);
          parts.push(`> Generated by repointxt (100% Client-Side) at ${timestamp}`);
          parts.push(`> Part ${bIndex + 1} of ${fileBatches.length} | Selected files: ${allFiles.length}\n`);
          parts.push(`## File Manifest\n${treeManifest}\n`);

          if (isMultiPart) {
            const batchFilePaths = new Set(batchFiles.map(f => f.path));
            const deferredFiles = allFiles
              .filter(f => !batchFilePaths.has(f.path))
              .slice(0, 15)
              .map(f => `- \`${f.path}\``)
              .join('\n');

            parts.push(`## Multi-Part Batch Notice`);
            parts.push(`CRITICAL: This is Part ${bIndex + 1} of a ${fileBatches.length}-part codebase bundle.`);
            parts.push(`Deferred files sample:\n${deferredFiles}\n`);
          }
        } else {
          parts.push(
            `<codebase_context ` +
            `tool="repointxt by Corbit Technologies" ` +
            `github="https://github.com/CorbitTechnologies/repointxt" ` +
            `generated_at="${timestamp}" ` +
            `part="${bIndex + 1}" ` +
            `total_parts="${fileBatches.length}">`
          );
          parts.push(`  <overview>`);
          parts.push(topologyXml);
          parts.push(`    <selected_files_count>${allFiles.length}</selected_files_count>`);
          if (asciiTree) {
            parts.push(`    <directory_structure>\n${asciiTree}\n    </directory_structure>`);
          }
          parts.push(`    <manifest>\n${treeManifest}\n    </manifest>`);

          if (isMultiPart) {
            const batchFilePaths = new Set(batchFiles.map(f => f.path));
            const deferredFiles = allFiles
              .filter(f => !batchFilePaths.has(f.path))
              .slice(0, 15)
              .map(f => `      <file>${f.path}</file>`)
              .join('\n');

            parts.push(`    <context_batch_metadata>`);
            parts.push(`      <current_part>${bIndex + 1}</current_part>`);
            parts.push(`      <total_parts>${fileBatches.length}</total_parts>`);
            parts.push(`      <deferred_files_sample>\n${deferredFiles}\n      </deferred_files_sample>`);
            parts.push(`      <ai_instruction>`);
            parts.push(`        CRITICAL: This is Part ${bIndex + 1} of a ${fileBatches.length}-part codebase bundle.`);
            parts.push(`        - Do NOT assume deferred or omitted files are missing from the project.`);
            parts.push(`        - Acknowledge receipt of Part ${bIndex + 1} and await subsequent parts before assuming missing dependencies.`);
            parts.push(`      </ai_instruction>`);
            parts.push(`    </context_batch_metadata>`);
          }
          parts.push(`  </overview>\n`);
        }

        const batchResults = await mapConcurrent(batchFiles, 16, async (f: FileItem) => {
          try {
            let content = '';
            if (f.sourceType === 'github') {
              content = await fetchFileContent(
                f.sourceOwner || sources[0].owner!,
                f.sourceRepo || sources[0].repo!,
                f.sourceBranch || sources[0].branch || 'main',
                f.originalPath || f.path,
                githubToken,
                f.sourceId
              );
            } else {
              content = f.file ? await f.file.text() : await (await fetch(f.url!)).text();
            }

            const { content: opt, redactedSecretsCount } = optimizeContent(content, f.originalPath || f.path, {
              removeComments: options.removeComments,
              removeExtraWhitespace: options.removeExtraWhitespace,
            });

            const ext = f.path.includes('.') ? f.path.slice(f.path.lastIndexOf('.') + 1).toLowerCase() : 'text';
            const estTokens = estimateTokens(opt);

            let boundaryAttr = '';
            if (/\.(tsx|jsx|js|ts)$/i.test(f.path)) {
              const boundary = detectBoundary(content);
              if (boundary) {
                boundaryAttr = ` boundary="${boundary}"`;
              }
            }

            if (isMarkdown) {
              return {
                text: `## File: ${f.path}\n\`\`\`${ext}\n${opt}\n\`\`\``,
                redactedCount: redactedSecretsCount,
              };
            }

            // Standard XML CDATA with safe escape for embedded closing tags:
            const safeContent = opt.replace(/]]>/g, ']]]]><![CDATA[> >');
            return {
              text: `  <file path="${f.path}"${boundaryAttr} language="${ext}" tokens="~${estTokens}">\n<![CDATA[\n${safeContent}\n]]>\n  </file>`,
              redactedCount: redactedSecretsCount,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (isMarkdown) {
              return {
                text: `## File: ${f.path}\n<!-- Error reading file: ${msg} -->`,
                redactedCount: 0,
              };
            }
            return {
              text: `  <file path="${f.path}" status="error">\n    <!-- Error reading file: ${msg} -->\n  </file>`,
              redactedCount: 0,
            };
          }
        });

        const batchFileTexts = batchResults.map(r => r.text);
        const batchRedactedCount = batchResults.reduce((acc, r) => acc + (r.redactedCount || 0), 0);

        parts.push(batchFileTexts.join('\n\n'));

        // 3. BOTTOM: Operational Prompt Anchor (Recency-Bias Anchor)
        if (isMarkdown) {
          parts.push(`\n## Instructions`);
          parts.push(`- Reference exact file paths when analyzing or citing code.`);
          parts.push(`- Base all recommendations strictly on the implementation patterns provided above.`);
          parts.push(`- Avoid leaving placeholder comments like '// ... rest of code' when suggesting edits.`);
        } else {
          parts.push(`\n  <instructions>`);
          parts.push(`    - Reference exact file paths from <file path="..."> when analyzing or citing code.`);
          parts.push(`    - Base all recommendations strictly on the implementation patterns provided above.`);
          parts.push(`    - Avoid leaving placeholder comments like '// ... rest of code' when suggesting edits.`);
          parts.push(`  </instructions>`);
          parts.push(`</codebase_context>`);
        }

        const batchText = parts.join('\n');
        generatedBatches.push({
          part: bIndex + 1,
          totalParts: fileBatches.length,
          text: batchText,
          tokenCount: estimateTokens(batchText),
          charCount: batchText.length,
          redactedSecretsCount: batchRedactedCount,
        });
      }

      const elapsedMs = Math.round(performance.now() - startTime);

      const batchesWithMetrics = generatedBatches.map(b => ({
        ...b,
        elapsedMs
      }));

      setOutputBatches(batchesWithMetrics);
      setActiveBatchIndex(0);

      const totalTokens = generatedBatches.reduce((acc, b) => acc + b.tokenCount, 0);
      trackEvent('generate_bundle_success', {
        batchCount: generatedBatches.length,
        totalTokens,
        fileCount: allFiles.length,
        elapsedMs
      });

      if (batchesWithMetrics.length > 0) {
        navigator.clipboard.writeText(batchesWithMetrics[0].text).catch(() => {});
      }

      setTimeout(() => {
        document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e: any) {
      logCrash(e, false, { context: 'generateText' });
      window.alert('Failed to generate context bundles');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [sources, selectedFiles, options, githubToken]);

  // 1. Complete reset function (wipes memory, trees, blobs, and output)
  const clearAll = useCallback(() => {
    clearAllRepoZipCaches();
    blobUrlsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
    blobUrlsRef.current = [];
    setSources([]);
    setOutputBatches([]);
    setActiveBatchIndex(0);
  }, []);

  // 2. Output-only clear function
  const clearOutput = useCallback(() => {
    setOutputBatches([]);
    setActiveBatchIndex(0);
  }, []);

  // 3. Update removeSource to clear output if no sources remain
  const removeSource = useCallback((id: string) => {
    clearRepoZipCache(id);
    setSources(prev => {
      const source = prev.find(s => s.id === id);
      source?.tree.forEach(item => {
        if (item.url) {
          try { URL.revokeObjectURL(item.url); } catch (_) {}
        }
      });
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        setOutputBatches([]);
        setActiveBatchIndex(0);
      }
      return remaining;
    });
  }, []);

  return {
    loading, loadingMessage, errorMessage, clearErrorMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging,
    options, updateOption,
    activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    clearAll, clearOutput,
    treeData, selectedFiles, setSelectedFiles,
    combinedOutput: outputBatches[activeBatchIndex]?.text || '',
    tokenCount: outputBatches[activeBatchIndex]?.tokenCount || 0,
    setIsDragging,
    processDroppedItems: async (dataTransfer: DataTransfer) => {
      setIsDragging(false);
      setLoading(true);
      setLoadingMessage('Reading dropped files & folders...');

      try {
        const items = dataTransfer.items;
        const collectedFiles: Array<{ path: string; file: File; size: number }> = [];

        // Helper: recursive read from webkitGetAsEntry (handles dropped folders and directory trees)
        const readEntry = async (entry: any, currentPath = ''): Promise<void> => {
          if (!entry) return;
          const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          if (shouldIgnore(entryPath, options.ignorePatterns)) return;

          if (entry.isFile) {
            await new Promise<void>((resolve) => {
              entry.file((f: File) => {
                if (f.size <= Number(options.maxFileSize) * 1024) {
                  collectedFiles.push({ path: entryPath, file: f, size: f.size });
                }
                resolve();
              }, () => resolve());
            });
          } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const readEntriesBatch = async (): Promise<any[]> => {
              return new Promise((resolve) => {
                dirReader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
              });
            };

            let batch: any[];
            do {
              batch = await readEntriesBatch();
              for (const child of batch) {
                await readEntry(child, entryPath);
              }
            } while (batch.length > 0);
          }
        };

        // Try reading with webkitGetAsEntry if available
        if (items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
          for (let i = 0; i < items.length; i++) {
            const entry = (items[i] as any).webkitGetAsEntry();
            if (entry) {
              await readEntry(entry);
            }
          }
        } else if (dataTransfer.files && dataTransfer.files.length > 0) {
          // Fallback to standard FileList
          for (const f of Array.from(dataTransfer.files)) {
            const p = (f as any).webkitRelativePath || f.name;
            if (!shouldIgnore(p, options.ignorePatterns) && f.size <= Number(options.maxFileSize) * 1024) {
              collectedFiles.push({ path: p, file: f, size: f.size });
            }
          }
        }

        // Special handling: if a dropped file is a .zip file, extract it in-memory
        const finalTreeItems: FileItem[] = [];
        const sourceId = `drop-${Date.now()}`;
        let folderName = 'Dropped Items';

        for (const item of collectedFiles) {
          if (item.file.name.toLowerCase().endsWith('.zip')) {
            setLoadingMessage(`Extracting ZIP archive: ${item.file.name}...`);
            try {
              const zip = await JSZip.loadAsync(item.file);
              folderName = item.file.name.replace(/\.zip$/i, '');

              // Zip-Bomb & Memory Exhaustion Defense (Client-Side DOS protection)
              const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150 MB safety ceiling
              const MAX_TOTAL_FILES_PER_SCAN = 4000;

              let accumulatedBytes = 0;
              let fileCounter = 0;

              zip.forEach((_relPath, zipEntry) => {
                if (!zipEntry.dir) {
                  fileCounter++;
                  accumulatedBytes += (zipEntry as any)._data?.uncompressedSize || 0;
                }
              });

              if (fileCounter > MAX_TOTAL_FILES_PER_SCAN || accumulatedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
                window.alert(`Archive is too large to safely parse in-browser (${fileCounter} files, ~${Math.round(accumulatedBytes / (1024 * 1024))}MB). Please select specific subdirectories or smaller archives to prevent browser freezing.`);
                continue;
              }

              const zipPromises: Promise<void>[] = [];
              zip.forEach((relPath, zipEntry) => {
                const cleanRelPath = sanitizeArchivePath(relPath);
                if (!cleanRelPath || zipEntry.dir || shouldIgnore(cleanRelPath, options.ignorePatterns)) return;

                zipPromises.push(
                  zipEntry.async('blob').then(blob => {
                    if (blob.size <= Number(options.maxFileSize) * 1024) {
                      const fileObj = new File([blob], cleanRelPath.split('/').pop() || 'file', { type: blob.type });
                      finalTreeItems.push({
                        path: cleanRelPath,
                        originalPath: cleanRelPath,
                        type: 'blob',
                        size: blob.size,
                        file: fileObj,
                        sha: `zip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        sourceId
                      });
                    }
                  })
                );
              });
              await Promise.all(zipPromises);
            } catch (zipErr) {
              console.warn('Failed to parse as ZIP archive, treating as standard file', zipErr);
              finalTreeItems.push({
                path: item.path,
                originalPath: item.path,
                type: 'blob',
                size: item.size,
                file: item.file,
                sha: `file-${Date.now()}-${finalTreeItems.length}`,
                sourceId
              });
            }
          } else {
            finalTreeItems.push({
              path: item.path,
              originalPath: item.path,
              type: 'blob',
              size: item.size,
              file: item.file,
              sha: `file-${Date.now()}-${finalTreeItems.length}`,
              sourceId
            });
          }
        }

        if (finalTreeItems.length > 0) {
          // Detect root folder name if all files share common top directory
          const sample = finalTreeItems[0].path;
          if (sample.includes('/')) {
            const rootDir = sample.split('/')[0];
            if (finalTreeItems.every(f => f.path.startsWith(`${rootDir}/`))) {
              folderName = rootDir;
            }
          }

          const newSource: Source = {
            id: sourceId,
            type: 'local',
            name: folderName,
            tree: finalTreeItems,
            selectedFiles: smartSelectFiles(finalTreeItems)
          };

          setSources(prev => [...prev, newSource]);
          trackEvent('drop_files_success', { fileCount: finalTreeItems.length });
        }
      } catch (err) {
        console.error('Drop processing error', err);
        window.alert('Failed to process dropped files.');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
  };
};
