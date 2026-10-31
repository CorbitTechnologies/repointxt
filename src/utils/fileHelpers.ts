import { DEFAULT_IGNORE_PATTERNS, NON_CODE_EXTENSIONS } from './constants';
import { FileItem } from '../types';

const patternCache = new Map<string, RegExp[]>();

const getCompiledPatterns = (patternsStr: string): RegExp[] => {
  if (!patternCache.has(patternsStr)) {
    const compiled = patternsStr
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`(^|/)${escaped}(/|$)`, 'i');
      });
    patternCache.set(patternsStr, compiled);
  }
  return patternCache.get(patternsStr)!;
};

// Critical Secret & Credential Blocker to prevent private tokens/keys from ever reaching prompts
const CRITICAL_SECRET_REGEX = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.netrc|\.yarnrc|id_rsa|id_ed25519|\.pem|\.key|\.cert|\.pfx|credentials\.json|\.aws\/(?:credentials|config)|\.docker\/config\.json)$/i;

export const isSecretFile = (path: string): boolean => {
  if (!path) return false;
  // Always permit safe template examples
  const lower = path.toLowerCase();
  if (lower.endsWith('.env.example') || lower.endsWith('.env.template') || lower.endsWith('.env.sample')) {
    return false;
  }
  return CRITICAL_SECRET_REGEX.test(path);
};

export const shouldIgnore = (path: string, patternsStr: string = DEFAULT_IGNORE_PATTERNS.join(', ')): boolean => {
  if (!path) return true;

  // 1. Unconditional Secret & Credential Blocker
  if (isSecretFile(path)) return true;

  // 2. Dotfile handling
  const isEssentialDotFile = /(^|\/)(\.env\.example|\.env\.template|\.env\.sample|\.gitignore|\.eslintrc|\.github)([\/]|$)/i.test(path);
  if (!isEssentialDotFile && /(^|\/)\.[^/]+/i.test(path)) {
    if (/(^|\/)(\.git|\.cache|\.next|\.turbo|\.idea|\.vscode)([\/]|$)/i.test(path)) return true;
  }

  const compiled = getCompiledPatterns(patternsStr);
  return compiled.some(regex => regex.test(path));
};

export const getExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.');
  const lastSlash = path.lastIndexOf('/');
  if (lastDot === -1 || lastDot < lastSlash) return '';
  return path.slice(lastDot).toLowerCase();
};

export const isCodeFile = (path: string): boolean => {
  const ext = getExtension(path);
  return !ext || !NON_CODE_EXTENSIONS.has(ext);
};

import { getEncoding, Tiktoken } from 'js-tiktoken';

let tokenizerInstance: Tiktoken | null = null;

const getTokenizer = (): Tiktoken | null => {
  if (!tokenizerInstance) {
    try {
      tokenizerInstance = getEncoding('o200k_base');
    } catch {
      tokenizerInstance = null;
    }
  }
  return tokenizerInstance;
};

export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  try {
    const enc = getTokenizer();
    if (enc) {
      return enc.encode(text).length;
    }
  } catch {}
  return Math.ceil(text.length / 3.8);
};

export const smartSelectFiles = (treeItems: FileItem[]): FileItem[] => {
  if (!treeItems?.length) return [];

  const CORE_DIRECTORIES = new Set([
    'src', 'lib', 'app', 'apps', 'packages', 'services', 'modules',
    'pages', 'components', 'hooks', 'routes', 'functions', 'supabase', 'core', 'test'
  ]);

  const ESSENTIAL_FILENAMES = new Set([
    'package.json', 'pubspec.yaml', 'analysis_options.yaml', 'cargo.toml', 'go.mod', 'pyproject.toml',
    'requirements.txt', 'tsconfig.json', 'vite.config.ts', 'next.config.js',
    'androidmanifest.xml', 'build.gradle', 'build.gradle.kts', 'infoplist', 'podfile'
  ]);

  // Precompute project structure once to eliminate O(N^2) scan in filter loop
  const isFlutterProject = treeItems.some(i => i.path.toLowerCase().endsWith('pubspec.yaml'));

  const selected = treeItems.filter(item => {
    if (item.type !== 'blob') return false;
    if (!isCodeFile(item.path)) return false;

    const lowerPath = item.path.toLowerCase();
    const parts = lowerPath.split('/');
    const filename = parts[parts.length - 1];

    // For Flutter projects: by default select lib/, test/, pubspec.yaml, and key bridge files,
    // avoiding heavy boilerplate inside ios/ and android/ unless explicitly selected
    if (isFlutterProject) {
      if (filename === 'pubspec.yaml' || filename === 'analysis_options.yaml') return true;
      if (parts[0] === 'lib' || parts[0] === 'test') return true;
      // If inside ios/ or android/, only pick primary build/config manifests by default
      if (parts[0] === 'android' || parts[0] === 'ios') {
        return filename === 'androidmanifest.xml' ||
               filename === 'build.gradle' ||
               filename === 'build.gradle.kts' ||
               filename === 'podfile';
      }
    }

    if (ESSENTIAL_FILENAMES.has(filename)) return true;
    if (parts.some((part, idx) => idx < parts.length - 1 && CORE_DIRECTORIES.has(part))) return true;
    if (parts.length === 1) return true;

    return false;
  });

  return selected.length > 0 ? selected : treeItems.filter(i => i.type === 'blob' && isCodeFile(i.path));
};

export const chunkFilesByTokenLimit = (files: FileItem[], maxTokens: number = 128000): FileItem[][] => {
  if (!maxTokens || maxTokens <= 0) return [files];

  const batches: FileItem[][] = [];
  let currentBatch: FileItem[] = [];
  let currentTokens = 0;

  for (const file of files) {
    const estTokens = Math.ceil((file.size || 3500) / 3.8) + 150;
    if (currentTokens + estTokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [file];
      currentTokens = estTokens;
    } else {
      currentBatch.push(file);
      currentTokens += estTokens;
    }
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
};
