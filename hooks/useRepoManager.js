import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { shouldIgnore, buildDirStructure, estimateTokens, isImageFile } from '../utils/fileHelpers';
import { optimizeContent } from '../utils/contentOptimization';
import { DEFAULT_IGNORE_PATTERNS } from '../utils/constants';
import { extractTextFromPdf } from '../utils/pdfProcessor';
import { extractZipFile, isZipFile } from '../utils/zipProcessor';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';
import { parseGitignore } from '../utils/gitignoreParser';
import { getLanguageFromExtension } from '../utils/languageMap';
import { getExtension } from '../utils/fileHelpers';

// Concurrency limit for parallel fetching
// Concurrency limit for parallel fetching
const BATCH_SIZE = 25;

export const useRepoManager = () => {
    // GitHub-specific states
    const [githubUrl, setGithubUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [treeData, setTreeData] = useState(null);
    const [repoInfo, setRepoInfo] = useState(null);
    const [dirStructure, setDirStructure] = useState('');
    const [githubSelectedFiles, setGithubSelectedFiles] = useState([]);
    const [githubOutput, setGithubOutput] = useState('');
    const [githubTokenCount, setGithubTokenCount] = useState(0);
    const [showGithubSelection, setShowGithubSelection] = useState(false);
    const [urlHistory, setUrlHistory] = useState([]);

    // Local-specific states
    const [localTreeData, setLocalTreeData] = useState(null);
    const [localSelectedFiles, setLocalSelectedFiles] = useState([]);
    const [localOutput, setLocalOutput] = useState('');
    const [localTokenCount, setLocalTokenCount] = useState(0);
    const [showLocalSelection, setShowLocalSelection] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Shared states
    const [loading, setLoading] = useState(false);
    const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
    const [preamble, setPreamble] = useState('');
    const [removeComments, setRemoveComments] = useState(true);
    const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
    const [includeOnlyCode, setIncludeOnlyCode] = useState(false);
    const [maxFileSize, setMaxFileSize] = useState('100');
    const [activeTab, setActiveTab] = useState('github');
    const [tokenOptimizationLevel, setTokenOptimizationLevel] = useState(0); // 0: Standard, 1: Compact, 2: Minified
    const [disabledExtensions, setDisabledExtensions] = useState(new Set());
    const [respectGitignore, setRespectGitignore] = useState(true);

    // Track blob URLs for cleanup (memory leak fix)
    const blobUrlsRef = useRef([]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            blobUrlsRef.current.forEach(url => {
                try { URL.revokeObjectURL(url); } catch (e) { }
            });
        };
    }, []);

    // Helper to track blob URLs
    const createTrackedBlobUrl = useCallback((file) => {
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);
        return url;
    }, []);

    // Cleanup tracked URLs
    const cleanupBlobUrls = useCallback(() => {
        blobUrlsRef.current.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) { }
        });
        blobUrlsRef.current = [];
    }, []);

    // Load saved data on mount
    useEffect(() => {
        if (Platform.OS === 'web') {
            const savedToken = loadGitHubToken();
            const savedHistory = loadUrlHistory();
            const settings = loadAppSettings();

            if (savedToken) setGithubToken(savedToken);
            if (savedHistory.length > 0) setUrlHistory(savedHistory);

            if (settings) {
                if (settings.ignorePatterns !== undefined) {
                    const patterns = settings.ignorePatterns.split(',').map(p => p.trim()).filter(p => p);
                    if (!patterns.some(p => p.startsWith('.env'))) {
                        patterns.push('.env*');
                    }
                    setIgnorePatterns(patterns.join(', '));
                }
                if (settings.removeComments !== undefined) setRemoveComments(settings.removeComments);
                if (settings.removeExtraWhitespace !== undefined) setRemoveExtraWhitespace(settings.removeExtraWhitespace);
                if (settings.includeOnlyCode !== undefined) setIncludeOnlyCode(settings.includeOnlyCode);
                if (settings.maxFileSize !== undefined) setMaxFileSize(settings.maxFileSize);
                if (settings.tokenOptimizationLevel !== undefined) setTokenOptimizationLevel(settings.tokenOptimizationLevel);
                if (settings.respectGitignore !== undefined) setRespectGitignore(settings.respectGitignore);
            }
        }
    }, []);

    // Save settings when they change
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const settings = {
            ignorePatterns,
            removeComments,
            removeExtraWhitespace,
            includeOnlyCode,
            maxFileSize,
            tokenOptimizationLevel,
            respectGitignore,
        };

        const timeout = setTimeout(() => {
            saveAppSettings(settings);
        }, 1000);

        return () => clearTimeout(timeout);
    }, [ignorePatterns, removeComments, removeExtraWhitespace, includeOnlyCode, maxFileSize, tokenOptimizationLevel, respectGitignore]);

    // Debounced token saving
    useEffect(() => {
        if (Platform.OS !== 'web' || !githubToken) return;

        const timeout = setTimeout(() => {
            saveGitHubToken(githubToken);
        }, 500);

        return () => clearTimeout(timeout);
    }, [githubToken]);

    // Update dirStructure whenever selection or patterns change
    useEffect(() => {
        if (activeTab === 'github' && treeData) {
            setDirStructure(buildDirStructure(githubSelectedFiles, ignorePatterns, tokenOptimizationLevel));
        } else if (activeTab === 'local' && localTreeData) {
            setDirStructure(buildDirStructure(localSelectedFiles, ignorePatterns, tokenOptimizationLevel));
        }
    }, [githubSelectedFiles, localSelectedFiles, activeTab, treeData, localTreeData, ignorePatterns, tokenOptimizationLevel]);

    const fetchGitHubRepo = useCallback(async () => {
        if (!githubUrl.trim()) {
            Alert.alert('Error', 'Please enter a GitHub repository URL');
            return;
        }

        setLoading(true);
        setGithubOutput('');
        setDirStructure('');
        setGithubSelectedFiles([]);
        setTreeData(null);
        setRepoInfo(null);
        setDisabledExtensions(new Set());
        cleanupBlobUrls();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!urlMatch) {
                throw new Error('Invalid GitHub URL format');
            }

            const [, owner, repoName] = urlMatch;
            const cleanRepo = repoName.replace(/\.git$/, '');

            const headers = {
                'Accept': 'application/vnd.github.v3+json',
            };

            if (githubToken.trim()) {
                headers['Authorization'] = `Bearer ${githubToken.trim()}`;
            }

            const repoResponse = await fetch(
                `https://api.github.com/repos/${owner}/${cleanRepo}`,
                { headers, signal: controller.signal }
            );

            if (!repoResponse.ok) {
                throw new Error('Repository not found or access denied. Check the URL and token.');
            }

            const repoData = await repoResponse.json();
            setRepoInfo(repoData);
            const defaultBranch = repoData.default_branch;

            let currentIgnorePatterns = ignorePatterns;

            // Fetch .gitignore if enabled
            if (respectGitignore) {
                try {
                    const fileResp = await fetch(
                        `https://api.github.com/repos/${owner}/${cleanRepo}/contents/.gitignore`,
                        { headers, signal: controller.signal }
                    );

                    if (fileResp.ok) {
                        const fileData = await fileResp.json();
                        const content = atob(fileData.content);
                        const gitignorePatterns = parseGitignore(content);

                        if (gitignorePatterns.length > 0) {
                            const existing = currentIgnorePatterns.split(',').map(p => p.trim()).filter(p => p);
                            const combined = [...new Set([...existing, ...gitignorePatterns])];
                            currentIgnorePatterns = combined.join(', ');
                            setIgnorePatterns(currentIgnorePatterns);
                        }
                    }
                } catch (err) {
                    console.log('Error fetching .gitignore:', err);
                }
            }

            const treeResponse = await fetch(
                `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
                { headers, signal: controller.signal }
            );

            if (!treeResponse.ok) {
                throw new Error('Failed to fetch repository tree. The repository may be empty or access is restricted.');
            }

            const fetchedTreeData = await treeResponse.json();
            setTreeData(fetchedTreeData);

            // Pre-select files that are NOT ignored
            const initialSelected = fetchedTreeData.tree.filter(item =>
                item.type === 'blob' && !shouldIgnore(item.path, currentIgnorePatterns)
            );
            setGithubSelectedFiles(initialSelected);

            setShowGithubSelection(true);
            setLoading(false);

            // Save URL to history after successful fetch
            saveUrlToHistory(githubUrl);
            setUrlHistory(loadUrlHistory());

            clearTimeout(timeoutId);
        } catch (error) {
            if (error.name === 'AbortError') {
                Alert.alert('Error', 'Request timed out. The repository may be too large or the connection is slow.');
            } else {
                Alert.alert('Error', error.message || 'Failed to fetch repository');
            }
            setGithubOutput('Error: ' + (error.message || 'Failed to fetch repository'));
        } finally {
            setLoading(false);
        }
    }, [githubUrl, githubToken, ignorePatterns, cleanupBlobUrls]);

    // Fetch single file content (used in parallel batch processing)
    const fetchFileContent = async (file, owner, repo, headers, signal, maxFileSizeBytes, options) => {
        if (file.size > maxFileSizeBytes) {
            return {
                path: file.path,
                status: 'skipped',
                reason: `Size: ${Math.round(file.size / 1024)}KB exceeds limit`
            };
        }

        try {
            const contentResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
                { headers, signal }
            );

            if (!contentResponse.ok) {
                return { path: file.path, status: 'error', reason: 'Failed to fetch' };
            }

            const contentData = await contentResponse.json();

            let content;
            if (file.path.toLowerCase().endsWith('.pdf')) {
                const pdfResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
                    { headers: { ...headers, 'Accept': 'application/vnd.github.v3.raw' }, signal }
                );
                const blob = await pdfResponse.blob();
                const arrayBuffer = await blob.arrayBuffer();
                content = await extractTextFromPdf(arrayBuffer);
            } else {
                const base64 = contentData.content.replace(/\s/g, '');
                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                content = new TextDecoder().decode(bytes);

                // Check for binary content
                if (content.slice(0, 1024).includes('\0')) {
                    return { path: file.path, status: 'skipped', reason: 'Binary file' };
                }
            }

            const optContent = optimizeContent(content, file.path, options);
            return { path: file.path, status: 'success', content: optContent };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            return { path: file.path, status: 'error', reason: error.message };
        }
    };

    // Process repo tree with PARALLEL fetching
    const processRepoTree = async (treeDataObj, filesToProcess, headers, signal, repoDescription = '') => {
        const owner = treeDataObj.url.split('/')[4];
        const repo = treeDataObj.url.split('/')[5];
        const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;
        const options = { removeComments, removeExtraWhitespace };

        // Use array for efficient string building
        const textParts = [];

        // Sort results: README first, then alphabetical
        const allResults = [];

        // Process files in parallel batches
        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            const batch = filesToProcess.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(file => fetchFileContent(file, owner, repo, headers, signal, maxFileSizeBytes, options))
            );
            allResults.push(...batchResults);
        }

        allResults.sort((a, b) => {
            const aName = a.path.split('/').pop().toLowerCase();
            const bName = b.path.split('/').pop().toLowerCase();
            if (aName === 'readme.md') return -1;
            if (bName === 'readme.md') return 1;
            return a.path.localeCompare(b.path);
        });

        if (preamble.trim()) {
            textParts.push(`PREAMBLE / SYSTEM INSTRUCTIONS:\n${'='.repeat(50)}\n${preamble.trim()}\n${'='.repeat(50)}\n`);
        }

        textParts.push(`# Repository Analysis: ${repo}\n`);
        if (repoDescription) {
            textParts.push(`> ${repoDescription}\n`);
        }

        // Add Directory Structure based on SELECTED files
        const treeStr = buildDirStructure(filesToProcess, ignorePatterns, tokenOptimizationLevel);
        textParts.push(`## 1. Directory Structure\n\`\`\`text\n.\n${treeStr}\n\`\`\`\n`);

        textParts.push(`## 2. Codebase Context\n`);

        allResults.forEach(result => {
            if (result.status === 'success') {
                const ext = getExtension(result.path);
                const lang = getLanguageFromExtension(ext);

                if (tokenOptimizationLevel === 0) {
                    textParts.push(`---`);
                    textParts.push(`### FILE: ${result.path}`);
                    textParts.push(`**Path:** \`${result.path}\``);
                    textParts.push(`**Language:** ${lang || 'text'}`);
                    textParts.push(``);
                    textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                    textParts.push(``);
                } else if (tokenOptimizationLevel === 1) {
                    textParts.push(`---`);
                    textParts.push(`FILE: ${result.path} (${lang || 'text'})`);
                    textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                } else {
                    // Level 4: Minified Metadata Headers
                    textParts.push(`f:${result.path}`);
                    textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                }
            } else if (result.status === 'skipped') {
                if (tokenOptimizationLevel === 0) {
                    textParts.push(`---`);
                    textParts.push(`### FILE: ${result.path} [SKIPPED]`);
                    textParts.push(`**Reason:** ${result.reason}`);
                } else {
                    textParts.push(`f:${result.path} [SKIPPED: ${result.reason}]`);
                }
            }
        });

        const combinedText = textParts.join('\n');
        setGithubOutput(combinedText);
        setGithubTokenCount(estimateTokens(combinedText));
    };

    const generateGitHubText = useCallback(async () => {
        if (!treeData || githubSelectedFiles.length === 0) return;
        setLoading(true);
        setGithubOutput('');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // Extended timeout for batch processing
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

            await processRepoTree(treeData, githubSelectedFiles, headers, controller.signal, repoInfo?.description);
            clearTimeout(timeoutId);
        } catch (error) {
            if (error.name !== 'AbortError') {
                Alert.alert('Error', error.message || 'Failed to generate text');
            }
        } finally {
            setLoading(false);
        }
    }, [treeData, githubSelectedFiles, githubToken, maxFileSize, removeComments, removeExtraWhitespace, repoInfo, preamble, tokenOptimizationLevel]);

    const generateLocalText = useCallback(async () => {
        if (!localTreeData || localSelectedFiles.length === 0) return;
        setLoading(true);
        setLocalOutput('');

        try {
            const textParts = [];

            // Collect all results first
            const allResults = [];
            const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;
            const options = { removeComments, removeExtraWhitespace };

            // Process local files in parallel batches
            for (let i = 0; i < localSelectedFiles.length; i += BATCH_SIZE) {
                const batch = localSelectedFiles.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(async (file) => {
                    try {
                        if (file.size > maxFileSizeBytes) {
                            return {
                                path: file.path,
                                status: 'skipped',
                                reason: `Size: ${Math.round(file.size / 1024)}KB exceeds limit`
                            };
                        }

                        let content;
                        if (Platform.OS === 'web') {
                            const response = await fetch(file.url);
                            if (file.path.toLowerCase().endsWith('.pdf')) {
                                const arrayBuffer = await response.arrayBuffer();
                                content = await extractTextFromPdf(arrayBuffer);
                            } else {
                                content = await response.text();
                            }
                        } else {
                            if (file.path.toLowerCase().endsWith('.pdf')) {
                                const base64 = await FileSystem.readAsStringAsync(file.url, { encoding: FileSystem.EncodingType.Base64 });
                                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                                content = await extractTextFromPdf(bytes.buffer);
                            } else {
                                content = await FileSystem.readAsStringAsync(file.url, { encoding: FileSystem.EncodingType.UTF8 });
                            }
                        }

                        const optContent = optimizeContent(content, file.path, options);
                        return { path: file.path, status: 'success', content: optContent };
                    } catch (error) {
                        console.log(`Error processing ${file.path}:`, error);
                        return { path: file.path, status: 'error', reason: error.message };
                    }
                }));
                allResults.push(...results);
            }

            allResults.sort((a, b) => {
                const aName = a.path.split('/').pop().toLowerCase();
                const bName = b.path.split('/').pop().toLowerCase();
                if (aName === 'readme.md') return -1;
                if (bName === 'readme.md') return 1;
                return a.path.localeCompare(b.path);
            });

            if (preamble.trim()) {
                textParts.push(`PREAMBLE / SYSTEM INSTRUCTIONS:\n${'='.repeat(50)}\n${preamble.trim()}\n${'='.repeat(50)}\n`);
            }

            textParts.push(`# Repository Analysis: Local Files\n`);

            if (localSelectedFiles.length > 0) {
                const treeStr = buildDirStructure(localSelectedFiles, ignorePatterns, tokenOptimizationLevel);
                textParts.push(`## 1. Directory Structure\n\`\`\`text\n.\n${treeStr}\n\`\`\`\n`);
            }

            textParts.push(`## 2. Codebase Context\n`);

            allResults.forEach(result => {
                if (result.status === 'success') {
                    const ext = getExtension(result.path);
                    const lang = getLanguageFromExtension(ext);

                    if (tokenOptimizationLevel === 0) {
                        textParts.push(`---`);
                        textParts.push(`### FILE: ${result.path}`);
                        textParts.push(`**Path:** \`${result.path}\``);
                        textParts.push(`**Language:** ${lang || 'text'}`);
                        textParts.push(``);
                        textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                        textParts.push(``);
                    } else if (tokenOptimizationLevel === 1) {
                        textParts.push(`---`);
                        textParts.push(`FILE: ${result.path} (${lang || 'text'})`);
                        textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                    } else {
                        // Level 4: Minified Metadata Headers
                        textParts.push(`f:${result.path}`);
                        textParts.push(`\`\`\`${lang}\n${result.content}\n\`\`\``);
                    }
                } else if (result.status === 'skipped') {
                    if (tokenOptimizationLevel === 0) {
                        textParts.push(`---`);
                        textParts.push(`### FILE: ${result.path} [SKIPPED]`);
                        textParts.push(`**Reason:** ${result.reason}`);
                    } else {
                        textParts.push(`f:${result.path} [SKIPPED: ${result.reason}]`);
                    }
                }
            });

            const combinedText = textParts.join('\n');
            setLocalOutput(combinedText);
            setLocalTokenCount(estimateTokens(combinedText));
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to generate text');
        } finally {
            setLoading(false);
        }
    }, [localTreeData, localSelectedFiles, maxFileSize, removeComments, removeExtraWhitespace, preamble, ignorePatterns, tokenOptimizationLevel]);

    const pickLocalDirectory = useCallback(async () => {
        try {
            setLoading(true);
            cleanupBlobUrls();

            if (Platform.OS === 'web') {
                if (window.showDirectoryPicker) {
                    try {
                        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });

                        const readDirectoryHandle = async (handle, path = '') => {
                            const files = [];
                            const fullPath = path ? `${path}/${handle.name}` : handle.name;

                            if (path && shouldIgnore(fullPath, ignorePatterns)) {
                                return files;
                            }

                            for await (const entry of handle.values()) {
                                const entryPath = path ? `${path}/${entry.name}` : entry.name;

                                if (entry.kind === 'directory') {
                                    if (!shouldIgnore(entryPath, ignorePatterns)) {
                                        const subFiles = await readDirectoryHandle(entry, entryPath);
                                        files.push(...subFiles);
                                    }
                                } else if (entry.kind === 'file') {
                                    if (shouldIgnore(entryPath, ignorePatterns)) continue;
                                    if (isImageFile(entryPath)) continue;

                                    const file = await entry.getFile();

                                    if (isZipFile(entryPath)) {
                                        try {
                                            const extractedFiles = await extractZipFile(file, entry.name, ignorePatterns);
                                            for (const extracted of extractedFiles) {
                                                files.push({
                                                    file: extracted.file,
                                                    path: `${path ? path + '/' : ''}${extracted.path}`,
                                                    size: extracted.size,
                                                    url: extracted.url
                                                });
                                            }
                                        } catch (zipErr) {
                                            console.log('Failed to extract ZIP:', entryPath, zipErr);
                                        }
                                        continue;
                                    }

                                    files.push({ file, path: entryPath });
                                }
                            }
                            return files;
                        };

                        const allFiles = await readDirectoryHandle(dirHandle);

                        if (allFiles.length === 0) {
                            setLoading(false);
                            Alert.alert('No files', 'All files in the selected folder match the ignore patterns.');
                            return;
                        }

                        const treeItems = allFiles.map(({ file, path, url }, index) => ({
                            path: path,
                            type: 'blob',
                            size: file.size,
                            url: url || createTrackedBlobUrl(file),
                            sha: `local-dir-${index}`,
                        }));

                        setLocalTreeData({ tree: treeItems });
                        setDisabledExtensions(new Set());
                        setShowLocalSelection(true);
                        setLoading(false);
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            setLoading(false);
                            return;
                        }
                        console.log('File System Access API failed, falling back to input:', err);
                    }
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.multiple = true;
                input.onchange = async (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length === 0) { setLoading(false); return; }

                    const processedFiles = [];
                    for (const file of files) {
                        const path = file.webkitRelativePath || file.name;

                        if (shouldIgnore(path, ignorePatterns)) continue;
                        if (isImageFile(path)) continue;

                        if (isZipFile(path)) {
                            try {
                                const extractedFiles = await extractZipFile(file, file.name, ignorePatterns);
                                for (const extracted of extractedFiles) {
                                    processedFiles.push({
                                        path: extracted.path,
                                        size: extracted.size,
                                        url: extracted.url
                                    });
                                }
                            } catch (zipErr) {
                                console.log('Failed to extract ZIP:', path, zipErr);
                            }
                            continue;
                        }

                        processedFiles.push({
                            path,
                            size: file.size,
                            url: createTrackedBlobUrl(file)
                        });
                    }

                    if (processedFiles.length === 0) {
                        setLoading(false);
                        Alert.alert('No files', 'All files in the selected folder match the ignore patterns.');
                        return;
                    }

                    const treeItems = processedFiles.map((item, index) => ({
                        path: item.path,
                        type: 'blob',
                        size: item.size,
                        url: item.url,
                        sha: `local-dir-${index}`,
                    }));
                    setLocalTreeData({ tree: treeItems });
                    setDisabledExtensions(new Set());
                    setShowLocalSelection(true);
                    setLoading(false);
                };
                input.click();
            } else {
                const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
                if (result.canceled) { setLoading(false); return; }
                const files = result.assets || [result];
                const treeItems = files
                    .filter(file => !shouldIgnore(file.name, ignorePatterns))
                    .map((file, index) => ({
                        path: file.name,
                        type: 'blob',
                        size: file.size,
                        url: file.uri,
                        sha: `local-dir-${index}`,
                    }));

                if (treeItems.length === 0) {
                    setLoading(false);
                    Alert.alert('No files', 'Selected files match the ignore patterns.');
                    return;
                }

                setLocalTreeData({ tree: treeItems });
                setDisabledExtensions(new Set());
                setShowSelection(true);
                setLoading(false);
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to pick directory');
            setLoading(false);
        }
    }, [ignorePatterns, cleanupBlobUrls, createTrackedBlobUrl]);

    const pickLocalFiles = useCallback(async () => {
        try {
            setLoading(true);

            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '*/*';

                input.onchange = async (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length === 0) { setLoading(false); return; }

                    const processedFiles = [];
                    for (const file of files) {
                        if (shouldIgnore(file.name, ignorePatterns)) continue;
                        if (isImageFile(file.name)) continue;

                        if (isZipFile(file.name)) {
                            try {
                                const extractedFiles = await extractZipFile(file, file.name, ignorePatterns);
                                for (const extracted of extractedFiles) {
                                    processedFiles.push({
                                        path: extracted.path,
                                        size: extracted.size,
                                        url: extracted.url
                                    });
                                }
                            } catch (zipErr) {
                                console.log('Failed to extract ZIP:', file.name, zipErr);
                            }
                            continue;
                        }

                        processedFiles.push({
                            path: file.name,
                            size: file.size,
                            url: createTrackedBlobUrl(file)
                        });
                    }

                    if (processedFiles.length === 0) {
                        setLoading(false);
                        Alert.alert('No files', 'Selected files match the ignore patterns or are images.');
                        return;
                    }

                    const treeItems = processedFiles.map((item, index) => ({
                        path: item.path,
                        type: 'blob',
                        size: item.size,
                        url: item.url,
                        sha: `local-${index}`,
                    }));

                    setLocalTreeData({ tree: treeItems });
                    setDisabledExtensions(new Set());
                    setShowSelection(true);
                    setLoading(false);
                };
                input.click();
            } else {
                const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
                if (result.canceled) { setLoading(false); return; }
                const files = result.assets || [result];
                const treeItems = files
                    .filter(file => !shouldIgnore(file.name, ignorePatterns) && !isImageFile(file.name))
                    .map((file, index) => ({
                        path: file.name,
                        type: 'blob',
                        size: file.size,
                        url: file.uri,
                        sha: `local-${index}`,
                    }));

                if (treeItems.length === 0) {
                    setLoading(false);
                    Alert.alert('No files', 'Selected files match the ignore patterns or are images.');
                    return;
                }

                setLocalTreeData({ tree: treeItems });
                setDisabledExtensions(new Set());
                setShowLocalSelection(true);
                setLoading(false);
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to pick files');
            setLoading(false);
        }
    }, [ignorePatterns, createTrackedBlobUrl]);

    // Memoized drag handlers
    const handleDragEnter = useCallback((e) => {
        if (Platform.OS !== 'web') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        if (Platform.OS !== 'web') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        if (Platform.OS !== 'web') return;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e) => {
        if (Platform.OS !== 'web') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        try {
            setLoading(true);
            setLocalOutput('');
            setDirStructure('');
            cleanupBlobUrls();

            const readEntry = (entry, path = '') => {
                const fullPath = path ? `${path}/${entry.name}` : entry.name;

                if (shouldIgnore(fullPath, ignorePatterns)) {
                    return Promise.resolve([]);
                }

                return new Promise((resolve) => {
                    if (entry.isFile) {
                        entry.file((file) => {
                            resolve([{ file, path: fullPath }]);
                        }, () => resolve([]));
                    } else if (entry.isDirectory) {
                        const reader = entry.createReader();
                        const entries = [];

                        const readEntries = () => {
                            reader.readEntries(async (batch) => {
                                if (batch.length === 0) {
                                    const results = await Promise.all(
                                        entries.map(e => readEntry(e, fullPath))
                                    );
                                    resolve(results.flat());
                                } else {
                                    entries.push(...batch);
                                    readEntries();
                                }
                            }, () => resolve([]));
                        };
                        readEntries();
                    } else {
                        resolve([]);
                    }
                });
            };

            let allFiles = [];

            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                const items = Array.from(e.dataTransfer.items);
                const entries = items
                    .filter(item => item.kind === 'file')
                    .map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)
                    .filter(Boolean);

                if (entries.length > 0 && entries.some(entry => entry.isDirectory)) {
                    const results = await Promise.all(entries.map(entry => readEntry(entry)));
                    allFiles = results.flat();
                } else {
                    const files = Array.from(e.dataTransfer.files);
                    allFiles = files
                        .filter(file => !shouldIgnore(file.name, ignorePatterns))
                        .map(file => ({ file, path: file.name }));
                }
            } else {
                const files = Array.from(e.dataTransfer.files);
                allFiles = files
                    .filter(file => !shouldIgnore(file.webkitRelativePath || file.name, ignorePatterns))
                    .map(file => ({ file, path: file.webkitRelativePath || file.name }));
            }

            const processedFiles = [];
            for (const { file, path } of allFiles) {
                if (isImageFile(path)) continue;

                if (isZipFile(path)) {
                    try {
                        const extractedFiles = await extractZipFile(file, file.name, ignorePatterns);
                        for (const extracted of extractedFiles) {
                            processedFiles.push({
                                path: extracted.path,
                                size: extracted.size,
                                url: extracted.url
                            });
                        }
                    } catch (zipErr) {
                        console.log('Failed to extract ZIP:', path, zipErr);
                    }
                    continue;
                }

                processedFiles.push({
                    path,
                    size: file.size,
                    url: createTrackedBlobUrl(file)
                });
            }

            if (processedFiles.length === 0) {
                Alert.alert('No files', 'Please drop at least one file that is not ignored');
                setLoading(false);
                return;
            }

            const treeItems = processedFiles.map((item, index) => ({
                path: item.path,
                type: 'blob',
                size: item.size,
                url: item.url,
                sha: `local-drop-${index}`,
            }));

            setLocalTreeData({ tree: treeItems });

            // Pre-select non-ignored files
            setLocalSelectedFiles(treeItems.filter(item => !shouldIgnore(item.path, ignorePatterns)));

            setDisabledExtensions(new Set());
            setShowLocalSelection(true);
            setLoading(false);

        } catch (error) {
            Alert.alert('Error', 'Failed to process dropped files: ' + (error.message || 'Unknown error'));
            setLoading(false);
        }
    }, [ignorePatterns, cleanupBlobUrls, createTrackedBlobUrl]);

    return {
        // GitHub-specific
        githubUrl, setGithubUrl,
        githubToken, setGithubToken,
        treeData,
        repoInfo,
        dirStructure, setDirStructure,
        githubSelectedFiles, setGithubSelectedFiles,
        githubOutput, setGithubOutput,
        githubTokenCount,
        showGithubSelection, setShowGithubSelection,
        urlHistory,

        // Local-specific
        localTreeData,
        localSelectedFiles, setLocalSelectedFiles,
        localOutput, setLocalOutput,
        localTokenCount,
        showLocalSelection, setShowLocalSelection,
        isDragging,

        // Shared
        loading,
        ignorePatterns, setIgnorePatterns,
        preamble, setPreamble,
        removeComments, setRemoveComments,
        removeExtraWhitespace, setRemoveExtraWhitespace,
        includeOnlyCode, setIncludeOnlyCode,
        maxFileSize, setMaxFileSize,
        activeTab, setActiveTab,
        tokenOptimizationLevel, setTokenOptimizationLevel,
        disabledExtensions, setDisabledExtensions,
        respectGitignore, setRespectGitignore,

        // Handlers
        fetchGitHubRepo, generateGitHubText, generateLocalText, pickLocalDirectory, pickLocalFiles,
        handleDragEnter, handleDragLeave, handleDragOver, handleDrop
    };
};
