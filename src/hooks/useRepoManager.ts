import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DEFAULT_IGNORE_PATTERNS, DEFAULT_CONTEXT_TOKENS } from '../utils/constants';
import { saveAppSettings, loadAppSettings, saveGitHubToken, loadGitHubToken } from '../utils/storage';
import { clearRepoZipCache, clearAllRepoZipCaches } from '../services/githubService';
import { Source, FileItem, ProcessingOptionsState } from '../types';
import { useGitHubIngest } from './useGitHubIngest';
import { useLocalIngest } from './useLocalIngest';
import { usePromptBuilder } from './usePromptBuilder';

const defaultOptions: ProcessingOptionsState = {
  removeComments: false,
  removeExtraWhitespace: true,
  maxContextTokens: DEFAULT_CONTEXT_TOKENS,
  maxFileSize: 250,
  ignorePatterns: DEFAULT_IGNORE_PATTERNS.join(', '),
  outputFormat: 'xml',
};

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
  const isFirstRender = useRef(true);
  const packWorkerRef = useRef<Worker | null>(null);

  // The GitHub token lives here, not in useGitHubIngest, because generateText
  // needs it too. Building it after usePromptBuilder meant authenticated repo
  // reads silently fell back to anonymous requests (403/404 on private repos).
  const [githubToken, setGithubToken] = useState(() => loadGitHubToken() || '');

  // The worker chunk carries the ZIP runtime (~30 KB gzipped), so build it once
  // the browser is idle rather than competing with first paint. Until then every
  // call site already has a main-thread fallback.
  useEffect(() => {
    let cancelled = false;

    const create = () => {
      if (cancelled) return;
      try {
        if (typeof window !== 'undefined' && window.Worker) {
          packWorkerRef.current = new Worker(new URL('../workers/packWorker.ts', import.meta.url), { type: 'module' });
        }
      } catch (e) {
        console.warn('Worker initialization failed, fallback to main thread:', e);
      }
    };

    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const handle = typeof w.requestIdleCallback === 'function'
      ? w.requestIdleCallback(create, { timeout: 3000 })
      : window.setTimeout(create, 1500);

    return () => {
      cancelled = true;
      if (typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
      packWorkerRef.current?.terminate();
    };
  }, []);

  const updateOption = <K extends keyof ProcessingOptionsState>(key: K, value: ProcessingOptionsState[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

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

  const selectedFiles = useMemo(() => {
    const multi = sources.length > 1;
    const allSelected: FileItem[] = [];
    sources.forEach(source => {
      source.selectedFiles.forEach(file => {
        allSelected.push(normalizeFileItem(file, source, multi));
      });
    });
    return allSelected;
  }, [sources]);

  const {
    outputBatches, setOutputBatches,
    activeBatchIndex, setActiveBatchIndex,
    clearOutput, generateText,
  } = usePromptBuilder({
    sources,
    selectedFiles,
    options,
    githubToken,
    setLoading,
    setLoadingMessage,
    packWorkerRef,
  });

  const { githubUrl, setGithubUrl, githubBranch, setGithubBranch, githubRateLimit, urlHistory, fetchGitHubRepo } = useGitHubIngest({
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
  });

  const {
    isDragging, setIsDragging,
    pickLocalDirectory, pickLocalFiles, processDroppedItems,
  } = useLocalIngest({
    options,
    setSources,
    setOutputBatches,
    setLoading,
    setLoadingMessage,
    packWorkerRef,
  });

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

  const clearAll = useCallback(() => {
    clearAllRepoZipCaches();
    setSources([]);
    setOutputBatches([]);
    setActiveBatchIndex(0);
  }, [setOutputBatches, setActiveBatchIndex]);

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
  }, [setOutputBatches, setActiveBatchIndex]);

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
    processDroppedItems,
  };
};
