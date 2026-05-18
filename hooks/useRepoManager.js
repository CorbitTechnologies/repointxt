import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { shouldIgnore, buildDirStructure, estimateTokens, isImageFile, getExtension } from '../utils/fileHelpers';
import { optimizeContent } from '../utils/contentOptimization';
import { DEFAULT_IGNORE_PATTERNS } from '../utils/constants';
import { extractTextFromPdf } from '../utils/pdfProcessor';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';
import { parseGitignore } from '../utils/gitignoreParser';
import { getLanguageFromExtension } from '../utils/languageMap';

const BATCH_SIZE = 25;
const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000;

export const useRepoManager = () => {
    const [loading, setLoading] = useState(false);
    const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
    const [preamble, setPreamble] = useState('');
    const [removeComments, setRemoveComments] = useState(true);
    const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
    const [includeOnlyCode, setIncludeOnlyCode] = useState(false);
    const [maxFileSize, setMaxFileSize] = useState('100');
    const [activeTab, setActiveTab] = useState('github');
    const [tokenOptimizationLevel, setTokenOptimizationLevel] = useState(0);
    const [respectGitignore, setRespectGitignore] = useState(true);

    const [sources, setSources] = useState([]); 
    const [githubUrl, setGithubUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [urlHistory, setUrlHistory] = useState([]);
    const [combinedOutput, setCombinedOutput] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const blobUrlsRef = useRef([]);
    const githubApiCacheRef = useRef(new Map());
    const githubFileCacheRef = useRef(new Map());

    const createTrackedBlobUrl = useCallback((file) => {
        if (Platform.OS !== 'web') return file.uri;
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);
        return url;
    }, []);

    const cleanupBlobUrls = useCallback(() => {
        blobUrlsRef.current.forEach(url => { try { URL.revokeObjectURL(url); } catch (e) { } });
        blobUrlsRef.current = [];
    }, []);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const savedToken = loadGitHubToken();
            const savedHistory = loadUrlHistory();
            const settings = loadAppSettings();
            if (savedToken) setGithubToken(savedToken);
            if (savedHistory.length > 0) setUrlHistory(savedHistory);
            if (settings) {
                if (settings.ignorePatterns) setIgnorePatterns(settings.ignorePatterns);
                if (settings.removeComments !== undefined) setRemoveComments(settings.removeComments);
                if (settings.removeExtraWhitespace !== undefined) setRemoveExtraWhitespace(settings.removeExtraWhitespace);
                if (settings.maxFileSize) setMaxFileSize(settings.maxFileSize);
                if (settings.tokenOptimizationLevel !== undefined) setTokenOptimizationLevel(settings.tokenOptimizationLevel);
            }
        }
        return cleanupBlobUrls;
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        saveAppSettings({ ignorePatterns, removeComments, removeExtraWhitespace, maxFileSize, tokenOptimizationLevel });
    }, [ignorePatterns, removeComments, removeExtraWhitespace, maxFileSize, tokenOptimizationLevel]);

    const treeData = useMemo(() => {
        const allItems = [];
        sources.forEach(source => {
            source.tree.forEach(item => {
                allItems.push({
                    ...item,
                    path: sources.length > 1 ? `${source.name}/${item.path}` : item.path,
                    originalPath: item.path,
                    sourceId: source.id
                });
            });
        });
        return allItems.length > 0 ? { tree: allItems } : null;
    }, [sources]);

    const selectedFiles = useMemo(() => {
        const allSelected = [];
        sources.forEach(source => {
            source.selectedFiles.forEach(file => {
                allSelected.push({
                    ...file,
                    path: sources.length > 1 ? `${source.name}/${file.path}` : file.path,
                    originalPath: file.path,
                    sourceId: source.id
                });
            });
        });
        return allSelected;
    }, [sources]);

    const setSelectedFiles = useCallback((updater) => {
        setSources(prev => {
            const currentFlat = [];
            prev.forEach(s => s.selectedFiles.forEach(f => currentFlat.push({ ...f, path: prev.length > 1 ? `${s.name}/${f.path}` : f.path, originalPath: f.path, sourceId: s.id })));
            const nextFlat = typeof updater === 'function' ? updater(currentFlat) : updater;
            const grouped = {};
            nextFlat.forEach(f => { if (!grouped[f.sourceId]) grouped[f.sourceId] = []; grouped[f.sourceId].push({ ...f, path: f.originalPath }); });
            return prev.map(s => ({ ...s, selectedFiles: grouped[s.id] || [] }));
        });
    }, []);

    const fetchGitHubRepo = useCallback(async (isAdding = false) => {
        if (!githubUrl.trim()) return Alert.alert('Error', 'Enter a GitHub URL');
        setLoading(true);
        if (!isAdding) { setSources([]); setCombinedOutput(''); }

        try {
            const cleanUrl = githubUrl.trim().replace(/\/$/, '');
            const urlMatch = cleanUrl.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/i) || cleanUrl.match(/^([^\/]+)\/([^\/]+)$/i);
            if (!urlMatch) throw new Error('Invalid GitHub URL');
            const [, owner, repo] = urlMatch;
            const cleanRepo = repo.replace(/\.git$/, '');
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

            const repoResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
            if (!repoResp.ok) throw new Error('Repo not found');
            const repoData = await repoResp.json();
            const branch = repoData.default_branch;

            const treeResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${branch}?recursive=1`, { headers });
            if (!treeResp.ok) throw new Error('Failed to fetch tree');
            const treeDataResult = await treeResp.json();

            const newSource = {
                id: `gh-${Date.now()}`,
                type: 'github',
                name: cleanRepo,
                owner, repo: cleanRepo, branch,
                tree: treeDataResult.tree.filter(i => i.type === 'blob'),
                selectedFiles: treeDataResult.tree.filter(i => i.type === 'blob' && !shouldIgnore(i.path, ignorePatterns))
            };

            setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            setGithubUrl('');
            if (Platform.OS === 'web') { saveUrlToHistory(githubUrl); setUrlHistory(loadUrlHistory()); }
        } catch (e) { Alert.alert('Error', e.message); }
        finally { setLoading(false); }
    }, [githubUrl, githubToken, ignorePatterns]);

    const pickLocalDirectory = useCallback(async (isAdding = false) => {
        setLoading(true);
        if (!isAdding) { setSources([]); setCombinedOutput(''); }
        try {
            if (Platform.OS === 'web' && window.showDirectoryPicker) {
                const handle = await window.showDirectoryPicker();
                const files = [];
                const read = async (h, p = '') => {
                    for await (const e of h.values()) {
                        const ep = p ? `${p}/${e.name}` : e.name;
                        if (e.kind === 'directory') { if (!shouldIgnore(ep, ignorePatterns)) await read(e, ep); }
                        else if (e.kind === 'file' && !shouldIgnore(ep, ignorePatterns) && !isImageFile(ep)) {
                            const f = await e.getFile();
                            files.push({ path: ep, size: f.size, url: createTrackedBlobUrl(f) });
                        }
                    }
                };
                await read(handle);
                const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `loc-${Date.now()}-${i}` }));
                const newSource = { id: `loc-${Date.now()}`, type: 'local', name: handle.name, tree: treeItems, selectedFiles: treeItems };
                setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            } else {
                const res = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
                if (res.canceled) return;
                const treeItems = (res.assets || [res]).filter(f => !shouldIgnore(f.name, ignorePatterns)).map((f, i) => ({ path: f.name, type: 'blob', size: f.size, url: f.uri, sha: `loc-${i}` }));
                const newSource = { id: `loc-${Date.now()}`, type: 'local', name: 'Local Upload', tree: treeItems, selectedFiles: treeItems };
                setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            }
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }, [ignorePatterns, createTrackedBlobUrl]);

    const pickLocalFiles = useCallback(async (isAdding = false) => {
        setLoading(true);
        if (!isAdding) { setSources([]); setCombinedOutput(''); }
        try {
            const res = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
            if (res.canceled) return;
            const treeItems = (res.assets || [res]).filter(f => !shouldIgnore(f.name, ignorePatterns) && !isImageFile(f.name)).map((f, i) => {
                let fileUrl = f.uri;
                if (Platform.OS === 'web' && f.file) {
                    fileUrl = createTrackedBlobUrl(f.file);
                }
                return { path: f.name, type: 'blob', size: f.size, url: fileUrl, sha: `loc-file-${Date.now()}-${i}` };
            });
            const newSource = { id: `loc-files-${Date.now()}`, type: 'local', name: 'Local Files', tree: treeItems, selectedFiles: treeItems };
            setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }, [ignorePatterns, createTrackedBlobUrl]);

    const generateText = useCallback(async () => {
        if (sources.length === 0 || selectedFiles.length === 0) return;
        setLoading(true);
        try {
            const parts = [];
            if (preamble.trim()) parts.push(`INSTRUCTIONS:\n${preamble}\n${'='.repeat(20)}`);
            parts.push(`# AI Context Bundle - ${new Date().toLocaleDateString()}\n`);
            
            for (const s of sources) {
                if (s.selectedFiles.length === 0) continue;
                parts.push(`\n## SOURCE: ${s.name}\n`);
                for (const f of s.selectedFiles) {
                    let content = '';
                    if (s.type === 'github') {
                        const headers = { 'Accept': 'application/vnd.github.v3.raw' };
                        if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;
                        const resp = await fetch(`https://api.github.com/repos/${s.owner}/${s.repo}/contents/${f.path}`, { headers });
                        content = await resp.text();
                    } else {
                        if (Platform.OS !== 'web' && !f.url.startsWith('http')) {
                            content = await FileSystem.readAsStringAsync(f.url);
                        } else {
                            const resp = await fetch(f.url);
                            content = await resp.text();
                        }
                    }
                    const opt = optimizeContent(content, f.path, { removeComments, removeExtraWhitespace });
                    parts.push(`---\nFILE: ${s.name}/${f.path}\n\`\`\`\n${opt}\n\`\`\``);
                }
            }
            setCombinedOutput(parts.join('\n'));
        } catch (e) { Alert.alert('Error', 'Generation failed'); }
        finally { setLoading(false); }
    }, [sources, selectedFiles, preamble, removeComments, removeExtraWhitespace, githubToken]);

    const removeSource = useCallback((id) => {
        setSources(prev => prev.filter(s => s.id !== id));
    }, []);

    return {
        loading, sources, githubUrl, setGithubUrl, githubToken, setGithubToken, urlHistory,
        combinedOutput, isDragging, ignorePatterns, setIgnorePatterns, preamble, setPreamble,
        removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
        includeOnlyCode, setIncludeOnlyCode, maxFileSize, setMaxFileSize, activeTab, setActiveTab,
        tokenOptimizationLevel, setTokenOptimizationLevel, respectGitignore, setRespectGitignore,
        fetchGitHubRepo, pickLocalDirectory, generateText, removeSource,
        // Legacy props for compatibility
        treeData, selectedFiles, setSelectedFiles, githubOutput: combinedOutput, localOutput: combinedOutput,
        githubTokenCount: estimateTokens(combinedOutput), localTokenCount: estimateTokens(combinedOutput),
        showGithubSelection: sources.length > 0, showLocalSelection: sources.length > 0,
        pickLocalFiles,
        handleDragEnter: (e) => { e.preventDefault(); setIsDragging(true); },
        handleDragLeave: () => setIsDragging(false),
        handleDragOver: (e) => e.preventDefault(),
        handleDrop: async (e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!e.dataTransfer || !e.dataTransfer.items) return;
            setLoading(true);
            try {
                const files = [];
                const processEntry = async (entry, path = '') => {
                    if (entry.isFile) {
                        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                        const filePath = path ? `${path}/${file.name}` : file.name;
                        if (!shouldIgnore(filePath, ignorePatterns) && !isImageFile(filePath)) {
                            files.push({ path: filePath, size: file.size, url: createTrackedBlobUrl(file) });
                        }
                    } else if (entry.isDirectory) {
                        const dirPath = path ? `${path}/${entry.name}` : entry.name;
                        if (!shouldIgnore(dirPath, ignorePatterns)) {
                            const reader = entry.createReader();
                            const readEntries = async () => {
                                const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
                                if (entries.length > 0) {
                                    for (const child of entries) {
                                        await processEntry(child, dirPath);
                                    }
                                    await readEntries();
                                }
                            };
                            await readEntries();
                        }
                    }
                };

                for (let i = 0; i < e.dataTransfer.items.length; i++) {
                    const item = e.dataTransfer.items[i];
                    if (item.webkitGetAsEntry) {
                        const entry = item.webkitGetAsEntry();
                        if (entry) await processEntry(entry);
                    }
                }

                if (files.length > 0) {
                    const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `drop-${Date.now()}-${i}` }));
                    const newSource = { id: `drop-${Date.now()}`, type: 'local', name: 'Dropped Files', tree: treeItems, selectedFiles: treeItems };
                    setSources(prev => [...prev, newSource]);
                }
            } catch (err) {
                console.log('Drop error', err);
            } finally {
                setLoading(false);
            }
        }
    };
};
