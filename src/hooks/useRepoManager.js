import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  shouldIgnore,
  estimateTokens,
  smartSelectFiles,
  chunkFilesByTokenLimit,
  isCodeFile
} from '../utils/fileHelpers';
import { optimizeContent } from '../utils/contentOptimization';
import { DEFAULT_IGNORE_PATTERNS } from '../utils/constants';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';

export const useRepoManager = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
  const [preamble, setPreamble] = useState('');
  const [removeComments, setRemoveComments] = useState(true);
  const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
  const [maxContextTokens, setMaxContextTokens] = useState(1000000); // Default 1M (Gemini Context)
  const [maxFileSize, setMaxFileSize] = useState('250'); // 250KB limit per file
  const [activeTab, setActiveTab] = useState('github');

  const [sources, setSources] = useState([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubRateLimit, setGithubRateLimit] = useState(null);
  const [urlHistory, setUrlHistory] = useState([]);
  const [outputBatches, setOutputBatches] = useState([]); // Supports multi-part context splitting
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const blobUrlsRef = useRef([]);

  const createTrackedBlobUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    const savedToken = loadGitHubToken();
    const savedHistory = loadUrlHistory();
    const settings = loadAppSettings();
    if (savedToken) setGithubToken(savedToken);
    if (savedHistory.length > 0) setUrlHistory(savedHistory);
    if (settings) {
      if (settings.ignorePatterns) setIgnorePatterns(settings.ignorePatterns);
      if (settings.removeComments !== undefined) setRemoveComments(settings.removeComments);
      if (settings.removeExtraWhitespace !== undefined) setRemoveExtraWhitespace(settings.removeExtraWhitespace);
      if (settings.maxContextTokens !== undefined) setMaxContextTokens(settings.maxContextTokens);
      if (settings.maxFileSize) setMaxFileSize(settings.maxFileSize);
    }
  }, []);

  useEffect(() => {
    saveAppSettings({
      ignorePatterns,
      removeComments,
      removeExtraWhitespace,
      maxContextTokens,
      maxFileSize
    });
    saveGitHubToken(githubToken);
  }, [ignorePatterns, removeComments, removeExtraWhitespace, maxContextTokens, maxFileSize, githubToken]);

  const treeData = useMemo(() => {
    const allItems = [];
    sources.forEach(source => {
      source.tree.forEach(item => {
        const origPath = item.originalPath || item.path;
        allItems.push({
          ...item,
          originalPath: origPath,
          path: sources.length > 1 ? `${source.name}/${origPath}` : origPath,
          sourceId: source.id,
          sourceOwner: source.owner,
          sourceRepo: source.repo,
          sourceBranch: source.branch
        });
      });
    });
    return allItems.length > 0 ? { tree: allItems } : null;
  }, [sources]);

  const selectedFiles = useMemo(() => {
    const allSelected = [];
    sources.forEach(source => {
      source.selectedFiles.forEach(file => {
        const origPath = file.originalPath || file.path;
        allSelected.push({
          ...file,
          originalPath: origPath,
          path: sources.length > 1 ? `${source.name}/${origPath}` : origPath,
          sourceId: source.id,
          sourceOwner: source.owner,
          sourceRepo: source.repo,
          sourceBranch: source.branch
        });
      });
    });
    return allSelected;
  }, [sources]);

  const setSelectedFiles = useCallback((updater) => {
    setSources(prev => {
      const currentFlat = [];
      prev.forEach(s => s.selectedFiles.forEach(f => {
        const origPath = f.originalPath || f.path;
        currentFlat.push({
          ...f,
          originalPath: origPath,
          path: prev.length > 1 ? `${s.name}/${origPath}` : origPath,
          sourceId: s.id,
          sourceOwner: s.owner,
          sourceRepo: s.repo,
          sourceBranch: s.branch
        });
      }));
      const nextFlat = typeof updater === 'function' ? updater(currentFlat) : updater;
      const grouped = {};
      nextFlat.forEach(f => {
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

  const updateRateLimit = (response) => {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    if (remaining !== null && limit !== null) {
      setGithubRateLimit({ remaining: Number(remaining), limit: Number(limit) });
    }
  };

  const fetchGitHubRepo = useCallback(async (isAdding = false) => {
    if (!githubUrl.trim()) return window.alert('Enter a valid GitHub Repository URL');
    setLoading(true);
    setLoadingMessage('Fetching GitHub tree...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const cleanUrl = githubUrl.trim().replace(/\/$/, '');
      const urlMatch = cleanUrl.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/i) || cleanUrl.match(/^([^\/]+)\/([^\/]+)$/i);
      if (!urlMatch) throw new Error('Invalid GitHub URL format');
      const [, owner, repo] = urlMatch;
      const cleanRepo = repo.replace(/\.git$/, '');

      const trimmedToken = githubToken.trim();
      const getAuthHeaders = (includeToken = true) => {
        const h = { 'Accept': 'application/vnd.github.v3+json' };
        if (includeToken && trimmedToken) {
          h['Authorization'] = trimmedToken.startsWith('ghp_') || trimmedToken.startsWith('github_pat_')
            ? `token ${trimmedToken}`
            : `Bearer ${trimmedToken}`;
        }
        return h;
      };

      // Fetch repo detail
      let repoResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers: getAuthHeaders(true) });
      updateRateLimit(repoResp);
      if (!repoResp.ok && trimmedToken) {
        // Fallback to unauthenticated fetch if token fails
        const unauthResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers: getAuthHeaders(false) });
        if (unauthResp.ok) {
          repoResp = unauthResp;
          updateRateLimit(repoResp);
        }
      }

      if (!repoResp.ok) {
        const errorBody = await repoResp.json().catch(() => ({}));
        const message = errorBody.message ? `${repoResp.status} ${errorBody.message}` : `HTTP ${repoResp.status}`;
        throw new Error(repoResp.status === 403 ? `Rate limit exceeded or private repo. Add GitHub Token. (${message})` : `Repository error: ${message}`);
      }

      const repoData = await repoResp.json();
      const targetBranch = githubBranch.trim() || repoData.default_branch;

      // Fetch tree recursively
      const treeApiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`;
      let treeResp = await fetch(treeApiUrl, { headers: getAuthHeaders(true) });
      updateRateLimit(treeResp);
      if (!treeResp.ok && trimmedToken) {
        const unauthResp = await fetch(treeApiUrl, { headers: getAuthHeaders(false) });
        if (unauthResp.ok) {
          treeResp = unauthResp;
          updateRateLimit(treeResp);
        }
      }

      if (!treeResp.ok) {
        const errorBody = await treeResp.json().catch(() => ({}));
        const message = errorBody.message ? `${treeResp.status} ${errorBody.message}` : `HTTP ${treeResp.status}`;
        throw new Error(`Failed to fetch tree structure: ${message}`);
      }

      const treeDataResult = await treeResp.json();

      const validTreeItems = treeDataResult.tree.filter(i => {
        if (i.type !== 'blob') return false;
        if (shouldIgnore(i.path, ignorePatterns)) return false;
        return true;
      }).map(i => ({
        ...i,
        originalPath: i.path
      }));

      const newSource = {
        id: `gh-${Date.now()}`,
        type: 'github',
        name: cleanRepo,
        owner, repo: cleanRepo, branch: targetBranch,
        tree: validTreeItems,
        selectedFiles: smartSelectFiles(validTreeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      setGithubUrl('');
      saveUrlToHistory(githubUrl);
      setUrlHistory(loadUrlHistory());
    } catch (e) {
      window.alert(e.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [githubUrl, githubBranch, githubToken, ignorePatterns]);

  const pickLocalDirectory = useCallback(async (isAdding = false) => {
    if (!window.showDirectoryPicker) {
      return window.alert("Directory picker is not supported in this browser. Please use 'Select Files' or Drag & Drop.");
    }
    setLoading(true);
    setLoadingMessage('Scanning directory...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const handle = await window.showDirectoryPicker();
      const files = [];

      const read = async (dirHandle, path = '') => {
        for await (const entry of dirHandle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          if (entry.kind === 'directory') {
            if (!shouldIgnore(entryPath, ignorePatterns)) {
              await read(entry, entryPath);
            }
          } else if (entry.kind === 'file') {
            if (!shouldIgnore(entryPath, ignorePatterns)) {
              const fileObj = await entry.getFile();
              if (fileObj.size <= Number(maxFileSize) * 1024) {
                files.push({
                  path: entryPath,
                  originalPath: entryPath,
                  size: fileObj.size,
                  url: createTrackedBlobUrl(fileObj),
                  file: fileObj
                });
              }
            }
          }
        }
      };

      await read(handle);

      const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `loc-${Date.now()}-${i}` }));
      const newSource = {
        id: `loc-${Date.now()}`,
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
  }, [ignorePatterns, maxFileSize, createTrackedBlobUrl]);

  const pickLocalFiles = useCallback(async (isAdding = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e) => {
      setLoading(true);
      setLoadingMessage('Loading files...');
      if (!isAdding) { setSources([]); setOutputBatches([]); }

      try {
        const selected = Array.from(e.target.files);
        const files = selected
          .filter(f => !shouldIgnore(f.name, ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            originalPath: f.name,
            type: 'blob',
            size: f.size,
            url: createTrackedBlobUrl(f),
            file: f,
            sha: `file-${Date.now()}-${i}`
          }));

        const newSource = {
          id: `files-${Date.now()}`,
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
  }, [ignorePatterns, createTrackedBlobUrl]);

  const generateText = useCallback(async () => {
    if (sources.length === 0 || selectedFiles.length === 0) return;
    setLoading(true);
    setLoadingMessage('Optimizing context bundles...');

    try {
      const allFiles = [];
      for (const s of sources) {
        if (!s.selectedFiles || s.selectedFiles.length === 0) continue;
        allFiles.push(...s.selectedFiles.map(f => {
          const origPath = f.originalPath || f.path;
          return {
            ...f,
            originalPath: origPath,
            displayPath: sources.length > 1 ? `${s.name}/${origPath}` : origPath,
            sourceName: s.name,
            sourceType: s.type,
            sourceOwner: s.owner,
            sourceRepo: s.repo,
            sourceBranch: s.branch
          };
        }));
      }

      // Chunk into batches based on LLM Context Target
      const fileBatches = chunkFilesByTokenLimit(allFiles, maxContextTokens);
      const generatedBatches = [];

      for (let bIndex = 0; bIndex < fileBatches.length; bIndex++) {
        const batchFiles = fileBatches[bIndex];
        const parts = [];

        if (preamble.trim()) {
          parts.push(`SYSTEM INSTRUCTIONS:\n${preamble}\n${'=' .repeat(30)}`);
        }

        const batchLabel = fileBatches.length > 1 ? ` (Part ${bIndex + 1} of ${fileBatches.length})` : '';
        parts.push(`# AI Context Bundle${batchLabel} - ${new Date().toLocaleDateString()}\n`);

        const BATCH_SIZE = 15;
        for (let i = 0; i < batchFiles.length; i += BATCH_SIZE) {
          const slice = batchFiles.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(slice.map(async (f) => {
            try {
              let content = '';
              if (f.sourceType === 'github') {
                const trimmedToken = githubToken.trim();
                const owner = f.sourceOwner || sources[0]?.owner;
                const repo = f.sourceRepo || sources[0]?.repo;
                const ref = f.sourceBranch || f.branch || sources[0]?.branch || 'main';
                const cleanPath = f.originalPath || f.path;
                const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');

                const getAuthHeaders = () => {
                  const h = {};
                  if (trimmedToken) {
                    h['Authorization'] = trimmedToken.startsWith('ghp_') || trimmedToken.startsWith('github_pat_')
                      ? `token ${trimmedToken}`
                      : `Bearer ${trimmedToken}`;
                  }
                  return h;
                };

                let contentFetched = null;
                let fetchError = null;

                // Attempt 1: Contents API with vnd.github.v3.raw
                try {
                  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
                  let resp = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3.raw', ...getAuthHeaders() }
                  });

                  if (!resp.ok && trimmedToken) {
                    const unauthResp = await fetch(apiUrl, {
                      headers: { 'Accept': 'application/vnd.github.v3.raw' }
                    });
                    if (unauthResp.ok) resp = unauthResp;
                  }

                  if (resp.ok) {
                    contentFetched = await resp.text();
                  } else {
                    fetchError = `API HTTP ${resp.status}`;
                  }
                } catch (e) {
                  fetchError = e.message;
                }

                // Attempt 2: Raw Github User Content fallback
                if (contentFetched === null) {
                  try {
                    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`;
                    let rawResp = await fetch(rawUrl, { headers: getAuthHeaders() });
                    if (!rawResp.ok && trimmedToken) {
                      rawResp = await fetch(rawUrl);
                    }
                    if (rawResp.ok) {
                      contentFetched = await rawResp.text();
                    } else if (!fetchError) {
                      fetchError = `Raw HTTP ${rawResp.status}`;
                    }
                  } catch (e) {
                    if (!fetchError) fetchError = e.message;
                  }
                }

                // Attempt 3: Base64 JSON contents API fallback
                if (contentFetched === null) {
                  try {
                    const jsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
                    let jsonResp = await fetch(jsonUrl, {
                      headers: { 'Accept': 'application/vnd.github.v3+json', ...getAuthHeaders() }
                    });
                    if (jsonResp.ok) {
                      const jsonBody = await jsonResp.json();
                      if (jsonBody.content && jsonBody.encoding === 'base64') {
                        const binaryStr = atob(jsonBody.content.replace(/\n/g, ''));
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let k = 0; k < binaryStr.length; k++) {
                          bytes[k] = binaryStr.charCodeAt(k);
                        }
                        contentFetched = new TextDecoder('utf-8').decode(bytes);
                      }
                    }
                  } catch (e) {
                    // ignore fallback error
                  }
                }

                if (contentFetched === null) {
                  throw new Error(`Fetch failed: ${fetchError || '404 Not Found'}`);
                }

                content = contentFetched;
              } else {
                content = f.file ? await f.file.text() : await (await fetch(f.url)).text();
              }

              const opt = optimizeContent(content, f.originalPath || f.path, { removeComments, removeExtraWhitespace });
              return `\n---\nFILE: ${f.displayPath || f.path}\n\`\`\`\n${opt}\n\`\`\``;
            } catch (err) {
              return `\n---\nFILE: ${f.displayPath || f.path}\n[Error loading content: ${err.message}]`;
            }
          }));

          parts.push(...batchResults);
          await new Promise(r => setTimeout(r, 0)); // Yield UI thread
        }

        const batchText = parts.join('\n');
        generatedBatches.push({
          part: bIndex + 1,
          totalParts: fileBatches.length,
          text: batchText,
          tokenCount: estimateTokens(batchText),
          charCount: batchText.length
        });
      }

      setOutputBatches(generatedBatches);
      setActiveBatchIndex(0);

      if (generatedBatches.length > 0) {
        navigator.clipboard.writeText(generatedBatches[0].text).catch(() => {});
      }
    } catch (e) {
      window.alert('Failed to generate context bundles');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [sources, selectedFiles, preamble, removeComments, removeExtraWhitespace, maxContextTokens, githubToken]);

  const removeSource = useCallback((id) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    loading, loadingMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging,
    ignorePatterns, setIgnorePatterns, preamble, setPreamble,
    removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
    maxContextTokens, setMaxContextTokens,
    maxFileSize, setMaxFileSize, activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    treeData, selectedFiles, setSelectedFiles,
    combinedOutput: outputBatches[activeBatchIndex]?.text || '',
    tokenCount: outputBatches[activeBatchIndex]?.tokenCount || 0,
    handleDragEnter: (e) => { e.preventDefault(); setIsDragging(true); },
    handleDragLeave: () => setIsDragging(false),
    handleDragOver: (e) => e.preventDefault(),
    handleDrop: async (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (!e.dataTransfer || !e.dataTransfer.files) return;
      setLoading(true);
      setLoadingMessage('Processing dropped files...');
      try {
        const droppedFiles = Array.from(e.dataTransfer.files);
        const valid = droppedFiles
          .filter(f => !shouldIgnore(f.name, ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            originalPath: f.name,
            type: 'blob',
            size: f.size,
            url: createTrackedBlobUrl(f),
            file: f,
            sha: `drop-${Date.now()}-${i}`
          }));

        if (valid.length > 0) {
          const newSource = {
            id: `drop-${Date.now()}`,
            type: 'local',
            name: 'Dropped Items',
            tree: valid,
            selectedFiles: smartSelectFiles(valid)
          };
          setSources(prev => [...prev, newSource]);
        }
      } catch (err) {
        console.error('Drop processing error', err);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
  };
};