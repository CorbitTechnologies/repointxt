
// Basic implementation of gitignore pattern matching
// This converts gitignore patterns to regular expressions

export const parseGitignore = (gitignoreContent) => {
    if (!gitignoreContent) return [];

    const lines = gitignoreContent.split('\n');
    const patterns = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

        patterns.push(trimmed);
    }

    return patterns;
};

// Helper to check if a file path matches a gitignore pattern
// This is a simplified version and might not cover all git edge cases but works for most
export const matchesGitignore = (filePath, patterns) => {
    if (!patterns || patterns.length === 0) return false;

    return patterns.some(pattern => {
        // Handle negation
        if (pattern.startsWith('!')) {
            // Logic for negation is complex to combine with "some", 
            // usually requires a dedicated library like 'ignore'. 
            // For this simple implementation, we'll skip complex negation support 
            // or handle it if needed. For now, let's treat it as a non-match.
            return false;
        }

        let p = pattern;

        // Handle directory specific patterns
        if (p.endsWith('/')) {
            p = p.slice(0, -1);
            if (filePath.startsWith(p + '/') || filePath.includes('/' + p + '/')) return true;
            if (filePath === p) return true;
            return false;
        }

        // Handle root relative patterns
        if (p.startsWith('/')) {
            p = p.slice(1);
            // Root relative means it must match the start of the path
            if (filePath === p) return true;
            if (filePath.startsWith(p + '/')) return true;
            return false;
        }

        // Handle glob patterns (simple version)
        // Convert glob to regex
        // Escape special regex chars
        let regexStr = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

        // Convert * to .*
        regexStr = regexStr.replace(/\*/g, '.*');

        // Convert ? to .
        regexStr = regexStr.replace(/\?/g, '.');

        // Handle ** for crossing directory boundaries
        // Note: The above * replacement handles ** somewhat, but standard * shouldn't cross directories usually
        // This is a trade-off for simplicity without a heavy library

        const regex = new RegExp(`(^|/)${regexStr}($|/)`);
        return regex.test(filePath);
    });
};
