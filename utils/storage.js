import { Platform } from 'react-native';

const STORAGE_KEYS = {
    GITHUB_TOKEN: 'repo2txt_github_token',
    URL_HISTORY: 'repo2txt_url_history',
};

// Max number of URLs to keep in history
const MAX_HISTORY = 10;

// Check if we're in a browser environment
const isWeb = Platform.OS === 'web';

// Simple obfuscation for token (not encryption, but better than plain text)
const obfuscate = (text) => {
    if (!text) return '';
    return btoa(encodeURIComponent(text));
};

const deobfuscate = (text) => {
    if (!text) return '';
    try {
        return decodeURIComponent(atob(text));
    } catch {
        return '';
    }
};

// Save GitHub token
export const saveGitHubToken = (token) => {
    if (!isWeb || !token) return;
    try {
        const obfuscated = obfuscate(token);
        localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, obfuscated);
    } catch (error) {
        console.error('Failed to save GitHub token:', error);
    }
};

// Load GitHub token
export const loadGitHubToken = () => {
    if (!isWeb) return '';
    try {
        const obfuscated = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
        return deobfuscate(obfuscated);
    } catch (error) {
        console.error('Failed to load GitHub token:', error);
        return '';
    }
};

// Clear GitHub token
export const clearGitHubToken = () => {
    if (!isWeb) return;
    try {
        localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
    } catch (error) {
        console.error('Failed to clear GitHub token:', error);
    }
};

// Save URL to history
export const saveUrlToHistory = (url) => {
    if (!isWeb || !url) return;
    try {
        const history = loadUrlHistory();

        // Remove if already exists (to move it to top)
        const filtered = history.filter(item => item !== url);

        // Add to beginning
        filtered.unshift(url);

        // Keep only MAX_HISTORY items
        const trimmed = filtered.slice(0, MAX_HISTORY);

        localStorage.setItem(STORAGE_KEYS.URL_HISTORY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Failed to save URL to history:', error);
    }
};

// Load URL history
export const loadUrlHistory = () => {
    if (!isWeb) return [];
    try {
        const history = localStorage.getItem(STORAGE_KEYS.URL_HISTORY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Failed to load URL history:', error);
        return [];
    }
};

// Clear URL history
export const clearUrlHistory = () => {
    if (!isWeb) return;
    try {
        localStorage.removeItem(STORAGE_KEYS.URL_HISTORY);
    } catch (error) {
        console.error('Failed to clear URL history:', error);
    }
};
