const STORAGE_KEYS = {
    GITHUB_TOKEN: 'repointxt_github_token',
    URL_HISTORY: 'repointxt_url_history',
    APP_SETTINGS: 'repointxt_app_settings',
};

const LEGACY_STORAGE_KEYS = {
    GITHUB_TOKEN: 'repo2txt_github_token',
    URL_HISTORY: 'repo2txt_url_history',
    APP_SETTINGS: 'repo2txt_app_settings',
};

const MAX_HISTORY = 10;

const obfuscate = (text: string): string => {
    if (!text) return '';
    try {
        return btoa(encodeURIComponent(text));
    } catch {
        return '';
    }
};

const deobfuscate = (text: string): string => {
    if (!text) return '';
    try {
        return decodeURIComponent(atob(text));
    } catch {
        return '';
    }
};

export const saveGitHubToken = (token: string, persist = false): void => {
    try {
        const obfuscated = obfuscate(token);
        // Default exclusively to sessionStorage so PATs are wiped when tab closes.
        // localStorage is only used if explicit persistence is requested with user awareness.
        if (persist) {
            localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, obfuscated);
            sessionStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
        } else {
            sessionStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, obfuscated);
            localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
            localStorage.removeItem(LEGACY_STORAGE_KEYS.GITHUB_TOKEN);
        }
    } catch (error) {
        console.error('Failed to save GitHub token:', error);
    }
};

export const loadGitHubToken = (): string => {
    try {
        // Check sessionStorage first (safest, non-persistent), then fallback to localStorage if user explicitly persisted
        const obfuscated = sessionStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN)
            || localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
        return deobfuscate(obfuscated || '');
    } catch (error) {
        console.error('Failed to load GitHub token:', error);
        return '';
    }
};

export const clearGitHubToken = (): void => {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
        localStorage.removeItem(LEGACY_STORAGE_KEYS.GITHUB_TOKEN);
    } catch (error) {
        console.error('Failed to clear GitHub token:', error);
    }
};

export const saveUrlToHistory = (url: string): void => {
    if (!url) return;
    try {
        const history = loadUrlHistory();
        const filtered = history.filter(item => item !== url);
        filtered.unshift(url);
        const trimmed = filtered.slice(0, MAX_HISTORY);
        localStorage.setItem(STORAGE_KEYS.URL_HISTORY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Failed to save URL to history:', error);
    }
};

export const loadUrlHistory = (): string[] => {
    try {
        const history = localStorage.getItem(STORAGE_KEYS.URL_HISTORY)
            || localStorage.getItem(LEGACY_STORAGE_KEYS.URL_HISTORY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Failed to load URL history:', error);
        return [];
    }
};

export const clearUrlHistory = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEYS.URL_HISTORY);
    } catch (error) {
        console.error('Failed to clear URL history:', error);
    }
};

const SETTINGS_SCHEMA_VERSION = 2; // Bump to migrate legacy <2026 context limits to 1M

export const saveAppSettings = (settings: any): void => {
    if (!settings) return;
    try {
        localStorage.setItem(
            STORAGE_KEYS.APP_SETTINGS,
            JSON.stringify({ ...settings, _v: SETTINGS_SCHEMA_VERSION })
        );
    } catch (error) {
        console.error('Failed to save app settings:', error);
    }
};

export const loadAppSettings = (): any => {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)
            || localStorage.getItem(LEGACY_STORAGE_KEYS.APP_SETTINGS);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // One-time migration: reset maxContextTokens to undefined so DEFAULT_CONTEXT_TOKENS (1M) takes over
        if (!parsed._v || parsed._v < SETTINGS_SCHEMA_VERSION) {
            delete parsed.maxContextTokens;
        }
        return parsed;
    } catch (error) {
        console.error('Failed to load app settings:', error);
        return null;
    }
};
