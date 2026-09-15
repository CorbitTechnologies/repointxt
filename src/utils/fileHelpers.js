import { DEFAULT_IGNORE_PATTERNS, NON_CODE_EXTENSIONS } from './constants';

const patternCache = new Map();

const getCompiledPatterns = (patternsStr) => {
  if (!patternCache.has(patternsStr)) {
    const compiled = patternsStr
      .split(',')
      .map(p => {
        const trimmed = p.trim();
        if (!trimmed) return null;
        if (trimmed.includes('*')) {
          const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
        }
        return trimmed;
      })
      .filter(Boolean);
    patternCache.set(patternsStr, compiled);
  }
  return patternCache.get(patternsStr);
};

export const shouldIgnore = (path, patternsStr = DEFAULT_IGNORE_PATTERNS.join(', ')) => {
  if (!path) return true;

  // Check for hidden files/folders (any segment starting with '.')
  const parts = path.split('/');
  if (parts.some(p => p.startsWith('.'))) {
    return true;
  }

  // Hard safety check for critical freeze vectors
  const lower = path.toLowerCase();
  if (
    lower.includes('node_modules/') || lower.startsWith('node_modules') ||
    lower.includes('/target/') || lower.includes('/vendor/') ||
    lower.includes('/dist/') || lower.includes('/build/')
  ) {
    return true;
  }

  const compiled = getCompiledPatterns(patternsStr);
  return compiled.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(parts[parts.length - 1]);
    }
    return path === pattern || path.startsWith(pattern + '/') || path.includes('/' + pattern + '/') || path.endsWith('/' + pattern);
  });
};

export const getExtension = (path) => {
  if (!path) return '';
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  const lastSlash = path.lastIndexOf('/');
  if (lastDot < lastSlash) return '';
  return path.slice(lastDot).toLowerCase();
};

export const isCodeFile = (path) => {
  const ext = getExtension(path);
  if (!ext) return true;
  return !NON_CODE_EXTENSIONS.has(ext);
};

export const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
};

export const smartSelectFiles = (treeItems) => {
  if (!treeItems || treeItems.length === 0) return [];

  const validBlobs = treeItems.filter(item => {
    if (item.type && item.type !== 'blob') return false;
    if (shouldIgnore(item.path)) return false;
    if (item.size && item.size > 250 * 1024) return false;
    return true;
  });

  if (validBlobs.length === 0) return [];

  const CORE_DIRECTORIES = new Set([
    'src', 'lib', 'app', 'apps', 'packages', 'services', 'libs', 'modules',
    'pages', 'components', 'hooks', 'routes', 'functions', 'function',
    'supabase', 'db', 'prisma', 'api', 'core', 'pkg', 'cmd', 'internal'
  ]);

  const ESSENTIAL_FILENAMES = new Set([
    'package.json', 'pubspec.yaml', 'pubspec.yml', 'cargo.toml', 'go.mod',
    'pyproject.toml', 'requirements.txt', 'index.html', 'turbo.json',
    'pnpm-workspace.yaml', 'lerna.json', 'nx.json', 'tsconfig.json',
    'vite.config.js', 'vite.config.ts', 'next.config.js', 'next.config.mjs',
    'next.config.ts', 'config.toml', 'seed.sql'
  ]);

  const selected = validBlobs.filter(item => {
    const origPath = item.originalPath || item.path;
    const lower = origPath.toLowerCase();
    const parts = lower.split('/');
    const filename = parts[parts.length - 1];

    // Check if essential config file
    if (ESSENTIAL_FILENAMES.has(filename)) {
      return true;
    }

    // Check if path contains any core source directory (monorepo or standard)
    const isInCoreDir = parts.some((part, idx) => {
      if (idx === parts.length - 1) return false;
      return CORE_DIRECTORIES.has(part);
    });

    if (isInCoreDir) {
      return true;
    }

    // Top-level source files (e.g. main.js, App.tsx, index.ts, lib.rs, main.go)
    if (parts.length === 1 && isCodeFile(origPath)) {
      return true;
    }

    return false;
  });

  if (selected.length > 0) {
    return selected;
  }

  // Fallback: select all valid blobs if none matched core rules
  return validBlobs;
};

export const chunkFilesByTokenLimit = (files, maxTokens = 128000) => {
  if (!maxTokens || maxTokens <= 0) return [files];

  const batches = [];
  let currentBatch = [];
  let currentTokens = 0;

  for (const file of files) {
    // Rough estimate: file size in bytes / 3.8
    const fileEstTokens = Math.ceil((file.size || 4000) / 3.8) + 200;

    if (currentTokens + fileEstTokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [file];
      currentTokens = fileEstTokens;
    } else {
      currentBatch.push(file);
      currentTokens += fileEstTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches.length > 0 ? batches : [files];
};