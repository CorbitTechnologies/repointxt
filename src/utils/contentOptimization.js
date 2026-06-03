// Pre-compiled regex patterns for better performance
const PATTERNS = {
    // Single-line comments
    jsComments: /\/\/.*$/gm,
    hashComments: /#.*$/gm,
    texComments: /%.*$/gm,

    // Multi-line comments
    blockComments: /\/\*[\s\S]*?\*\//g,

    // Python docstrings
    tripleDoubleQuotes: /"""[\s\S]*?"""/g,
    tripleSingleQuotes: /'''[\s\S]*?'''/g,

    // HTML/XML comments
    htmlComments: /<!--[\s\S]*?-->/g,

    // Whitespace
    trailingWhitespace: /[ \t]+$/gm,
    excessiveNewlines: /\n{3,}/g, // More than 2 newlines -> 2
    multiNewlines: /\n\s*\n\s*\n/g, // Alternative for consecutive newlines
    multiSpaces: /  +/g, // 2 or more spaces
};

// Extension patterns (using Sets for O(1) lookup)
const JS_LIKE = new Set(['.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.swift', '.kt', '.scala', '.php']);
const HASH_COMMENTS = new Set(['.py', '.sh', '.bash', '.r', '.rb', '.yaml', '.yml', '.toml']);
const TEX_COMMENTS = new Set(['.tex', '.latex', '.bib']);
const BLOCK_COMMENTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.css', '.scss', '.sass', '.php']);
const HTML_COMMENTS = new Set(['.html', '.xml', '.vue']);

const getExtension = (filePath) => {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filePath.slice(lastDot).toLowerCase();
};

export const removeCodeComments = (content, filePath, removeComments = true) => {
    if (!removeComments) return content;

    const ext = getExtension(filePath);
    let result = content;

    // Apply comment removal based on file type
    if (JS_LIKE.has(ext)) {
        result = result.replace(PATTERNS.blockComments, '');
        // Special case for // - don't strip if it looks like a URL
        result = result.replace(/^(?!\s*https?:\/\/)\s*\/\/.*$/gm, ''); // Whole line comments
        result = result.replace(/([^\/])\/\/.*$/gm, '$1'); // Trailing comments
    }
    if (HASH_COMMENTS.has(ext)) {
        result = result.replace(/^\s*#.*$/gm, '');
        result = result.replace(/([^\#])#.*$/gm, '$1');
    }
    if (TEX_COMMENTS.has(ext)) {
        result = result.replace(PATTERNS.texComments, '');
    }
    if (BLOCK_COMMENTS.has(ext)) {
        result = result.replace(PATTERNS.blockComments, '');
    }
    if (ext === '.py') {
        result = result.replace(PATTERNS.tripleDoubleQuotes, '');
        result = result.replace(PATTERNS.tripleSingleQuotes, '');
    }
    if (HTML_COMMENTS.has(ext)) {
        result = result.replace(PATTERNS.htmlComments, '');
    }

    return result;
};

/**
 * Level 3: Refine package.json to essential keys
 */
export const refinePackageContent = (content, filePath) => {
    if (filePath.endsWith('package.json')) {
        try {
            const json = JSON.parse(content);
            const refined = {
                name: json.name,
                version: json.version,
                scripts: json.scripts,
                dependencies: json.dependencies,
                devDependencies: json.devDependencies,
                peerDependencies: json.peerDependencies
            };
            // Remove empty keys
            Object.keys(refined).forEach(key => {
                if (!refined[key] || (typeof refined[key] === 'object' && Object.keys(refined[key]).length === 0)) {
                    delete refined[key];
                }
            });
            return JSON.stringify(refined, null, 2);
        } catch (e) {
            return content;
        }
    }
    return content;
};

export const optimizeContent = (content, filePath = '', options = {}) => {
    const { removeComments = true, removeExtraWhitespace = true } = options;
    let optimized = content;

    // Level 3: Refine package.json
    optimized = refinePackageContent(optimized, filePath);

    // Remove comments if enabled
    if (removeComments) {
        optimized = removeCodeComments(optimized, filePath, true);
    }

    // Remove extra whitespace if enabled (Level 2)
    if (removeExtraWhitespace) {
        optimized = optimized
            .replace(/\t/g, ' ') // Tabs to spaces
            .replace(PATTERNS.multiSpaces, ' ') // Double spaces to single
            .replace(PATTERNS.trailingWhitespace, '') // End of line spaces
            .replace(/\n\s*\n\s*\n/g, '\n\n'); // More than 2 newlines to 2
    }

    return optimized.trim();
};
