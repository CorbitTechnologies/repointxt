import { useState, useCallback, useEffect, useRef } from 'react';
import { saveUrlToHistory, loadUrlHistory } from '../utils/storage';
import { parseGitHubSlug, fetchTreeData, fetchRepoZipball, clearAllRepoZipCaches } from '../services/githubService';
import { trackEvent, measurePerformance, logCrash } from '../services/telemetry';
import { Source, FileItem, ProcessingOptionsState } from '../types';
import { shouldIgnore, smartSelectFiles } from '../utils/fileHelpers';

export interface UseGitHubIngestParams {
  options: ProcessingOptionsState;
  setOptions: React.Dispatch<React.SetStateAction<ProcessingOptionsState>>;
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  setOutputBatches: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  setErrorMessage: (msg: string | null) => void;
  /** Owned by useRepoManager so generateText can reuse the same credential. */
  githubToken: string;
  setGithubToken: React.Dispatch<React.SetStateAction<string>>;
}

export const useGitHubIngest = ({
  options,
  setOptions,
  setSources,
  setOutputBatches,
  setActiveTab,
  setLoading,
  setLoadingMessage,
  setErrorMessage,
  githubToken,
  setGithubToken,
}: UseGitHubIngestParams) => {
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubRateLimit, setGithubRateLimit] = useState<{ remaining: number; limit: number } | null>(null);
  const [urlHistory, setUrlHistory] = useState<string[]>(() => loadUrlHistory() || []);

  const autoIngestAttemptedRef = useRef(false);

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
  }, [githubUrl, githubBranch, githubToken, options.ignorePatterns, options.maxFileSize, setErrorMessage, setLoading, setLoadingMessage, setSources, setOutputBatches]);

  const parseAndIngestUrl = useCallback((isInitial = false) => {
    if (typeof window === 'undefined') return;
    try {
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
  }, [fetchGitHubRepo, setActiveTab, setOptions, setOutputBatches, setSources]);

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

  return {
    githubUrl, setGithubUrl,
    githubBranch, setGithubBranch,
    githubRateLimit, setGithubRateLimit,
    urlHistory, setUrlHistory,
    fetchGitHubRepo,
  };
};
