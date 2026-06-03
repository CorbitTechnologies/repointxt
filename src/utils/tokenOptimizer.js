/**
 * Token Optimization Utilities for LLM-friendly output
 */

/**
 * Strips comments from code strings based on extension
 */
export const stripComments = (content, path) => {
    const ext = path.split('.').pop().toLowerCase();

    // JS/TS/C/C++/Java/Go etc (// and /* */)
    if (['js', 'jsx', 'ts', 'tsx', 'c', 'cpp', 'h', 'java', 'go', 'cs', 'php', 'swift', 'kt'].includes(ext)) {
        // Strip multi-line comments
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        // Strip single-line comments (careful not to strip URLs)
        content = content.replace(/^(?!\s*https?:\/\/)\s*\/\/.*$/gm, '');
        // Strip trailing comments
        content = content.replace(/([^\/])\/\/.*$/gm, '$1');
    }

    // Python/Ruby/Shell/YAML/Docker etc (#)
    if (['py', 'rb', 'sh', 'yaml', 'yml', 'dockerfile', 'makefile', 'pl', 'r'].includes(ext)) {
        content = content.replace(/^\s*#.*$/gm, '');
        content = content.replace(/([^\#])#.*$/gm, '$1');
    }

    // HTML/XML/Markdown (<!-- -->)
    if (['html', 'xml', 'md', 'svg', 'vue'].includes(ext)) {
        content = content.replace(/<!--[\s\S]*?-->/g, '');
    }

    // CSS/SCSS/LESS (/* */)
    if (['css', 'scss', 'less'].includes(ext)) {
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    return content;
};

/**
 * Compresses whitespace and newlines
 */
export const compressWhitespace = (content) => {
    // Convert all tabs to single space
    content = content.replace(/\t/g, ' ');
    // Convert multiple spaces to single space (but preserve indentation if not fully stripping?)
    // Actually, Level 2 says "Convert all tabs/double-spaces to single spaces"
    content = content.replace(/  +/g, ' ');
    // Strip consecutive newlines (more than 2 -> 1)
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    // Remove leading/trailing whitespace from each line
    content = content.split('\n').map(line => line.trimEnd()).join('\n');
    return content.trim();
};

/**
 * Refines package.json to only include essential keys
 */
export const refinePackageJson = (content) => {
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
        return content; // If invalid JSON, return as is
    }
};

/**
 * Generates an optimized header for a file
 */
export const getOptimizedHeader = (path, language, level = 0) => {
    if (level === 0) {
        // Standard (Wasteful) - what we had before
        return `---
### FILE: ${path}
**Path:** \`${path}\`
**Language:** ${language || 'text'}
`;
    } else if (level === 1) {
        // Compact
        return `---
FILE: ${path} (${language || 'text'})
`;
    } else {
        // Level 4: Minified Metadata Headers
        return `f:${path}`;
    }
};
