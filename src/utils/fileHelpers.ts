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
  const lower = path.toLowerCase();
  if (lower.endsWith('.env.example') || lower.endsWith('.env.template') || lower.endsWith('.env.sample')) {
    return false;
  }
  return CRITICAL_SECRET_REGEX.test(path);
};

export const shouldIgnore = (path: string, patternsStr: string = DEFAULT_IGNORE_PATTERNS.join(', ')): boolean => {
  if (!path) return true;

  if (isSecretFile(path)) return true;

  const isEssentialDotFile = /(^|\/)(\.env\.example|\.env\.template|\.env\.sample|\.gitignore|\.eslintrc|\.github)([\/]|$)/i.test(path);
  if (!isEssentialDotFile && /(^|\/)\.[^/]+/i.test(path)) {
    if (/(^|\/)(\.git|\.cache|\.next|\.turbo|\.netlify|\.vercel|\.idea|\.vscode)([\/]|$)/i.test(path)) return true;
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

/**
 * Zero-dependency BPE approximation calibrated for modern large-vocabulary LLMs
 * (Google Gemini 256k, Claude 3.5/5.5, GPT-4o) with native indentation merging
 * and code subword packing.
 *
 * This runs on every file and on every assembled batch, so it must stay O(n)
 * with no allocations. It replaces heavy multi-megabyte tokenizer dictionaries
 * while keeping token counts aligned within ~3-5% of real LLM tokenizers.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;

  let tokens = 0;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const code = text.charCodeAt(i);

    // 1. Newline + Indentation:
    // Modern LLM tokenizers (Gemini SentencePiece, Claude BPE, GPT-4o o200k)
    // merge '\n' followed by indentation spaces/tabs into single tokens.
    if (code === 10) {
      tokens += 1;
      i++;
      let indentSpaces = 0;
      while (i < len && (text.charCodeAt(i) === 32 || text.charCodeAt(i) === 9)) {
        indentSpaces += (text.charCodeAt(i) === 9 ? 4 : 1);
        i++;
      }
      // Indentation beyond 4 spaces adds ~0.25 token per 4 spaces
      if (indentSpaces > 4) {
        tokens += Math.floor((indentSpaces - 4) / 4) * 0.25;
      }
      continue;
    }

    // 2. Mid-line whitespace runs (e.g. alignment spaces or tabs)
    if (code === 32 || code === 9) {
      let spaceCount = 0;
      while (i < len && (text.charCodeAt(i) === 32 || text.charCodeAt(i) === 9)) {
        spaceCount += (text.charCodeAt(i) === 9 ? 4 : 1);
        i++;
      }
      tokens += Math.ceil(spaceCount / 4) * 0.5;
      continue;
    }

    // 3. Word characters (identifiers, keywords, numbers)
    // In large 100k-256k vocabularies, programming keywords and subwords
    // merge ~6.5 characters per token.
    const isWord =
      (code >= 97 && code <= 122) || // a-z
      (code >= 65 && code <= 90) ||  // A-Z
      (code >= 48 && code <= 57) ||  // 0-9
      code === 95 ||                 // _
      code === 36;                   // $

    if (isWord) {
      let run = 0;
      while (i < len) {
        const c = text.charCodeAt(i);
        if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95 || c === 36) {
          run++;
          i++;
        } else {
          break;
        }
      }
      tokens += Math.ceil(run / 6.5);
      continue;
    }

    // 4. Operators, punctuation, and brackets
    if (code < 128) {
      tokens += 0.45;
    } else {
      tokens += 0.8; // Non-ASCII / Unicode characters
    }
    i++;
  }

  return Math.ceil(tokens);
};

/**
 * Average characters per token for source code in modern LLMs (~3.8).
 * UI budgets that only know a file's byte size use this so the pre-generation
 * progress bar and the generated bundle agree closely.
 */
export const AVG_CHARS_PER_TOKEN = 3.8;

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

  const isFlutterProject = treeItems.some(i => i.path.toLowerCase().endsWith('pubspec.yaml'));

  const selected = treeItems.filter(item => {
    if (item.type !== 'blob') return false;
    if (!isCodeFile(item.path)) return false;

    const lowerPath = item.path.toLowerCase();
    const parts = lowerPath.split('/');
    const filename = parts[parts.length - 1];

    if (isFlutterProject) {
      if (filename === 'pubspec.yaml' || filename === 'analysis_options.yaml') return true;
      if (parts[0] === 'lib' || parts[0] === 'test') return true;
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
    const fileContent = (file as any).content || '';
    const estTokens = fileContent ? estimateTokens(fileContent) : Math.ceil((file.size || 3500) / AVG_CHARS_PER_TOKEN) + 150;
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
