import { scanAndRedactSecrets } from './secretScanner';

const PATTERNS = {
  jsBlockComments: /\/\*[\s\S]*?\*\//g,
  jsComments: /(^|[^\S\r\n]|;|\})\/\/(?!\/)[^\r\n]*/g,
  hashComments: /(^|[^\S\r\n])#[^\r\n]*/g,
  htmlComments: /<!--[\s\S]*?-->/g,
  pyDocDouble: /"""[\s\S]*?"""/g,
  pyDocSingle: /'''[\s\S]*?'''/g,
  multiNewlines: /\n{3,}/g,
  spacesRun: /[ \t]+/g,
  trailingSpaces: /[ \t\r]+$/gm,
  jsPreserveAndComments: /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|(?<![a-zA-Z0-9_$)\s])\/(?![/*])(?:\\.|[^/\n\\])+\/[gimsuy]*)|\/\*[\s\S]*?\*\/|(?:\s|^|\b)\/\/(?!\/)[^\r\n]*/g,
  hashPreserveAndComments: /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*')|(^#!.*$)|((^|[^\S\r\n])#[^\r\n]*)/gm,
  licenseHeaders: /^(?:\/\*[\s\S]*?(?:copyright|license|all rights reserved)[\s\S]*?\*\/|\/\/(?:[^\n]*(?:copyright|license))[^\n]*\n*)+/i,
  svgPaths: /d="[MmLlHhVvCcSsQqTtAaZz0-9\s,\.\-]{40,}"/g,
  svgTargetExt: /\.(svg|tsx|jsx|html)$/i,
  tailwindClassName: /className=(["'`])([\s\S]*?)\1/g,
  supabaseRelationships: /Relationships: \[[^\]]*\]/g,
  supabaseInsert: /Insert: \{[\s\S]*?\}/g,
  supabaseUpdate: /Update: \{[\s\S]*?\}/g,
  boundaryClient: /['"]use client['"]/i,
  boundaryServer: /['"]use server['"]/i,
  boundaryEdge: /export const runtime = ['"]edge['"]/i,
};

const JS_FAMILY = new Set(['.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.swift', '.kt', '.php']);
const HASH_FAMILY = new Set(['.py', '.sh', '.bash', '.yaml', '.yml', '.toml', '.rb', '.dockerfile']);

// Only these can contain `className="..."` markup worth compacting.
const TAILWIND_TARGET = /\.(tsx|jsx|html|htm|vue|svelte|astro|mdx)$/i;

export const stripComments = (content: string, filePath: string): string => {
  const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')).toLowerCase() : '';

  if (JS_FAMILY.has(ext)) {
    return content.replace(
      PATTERNS.jsPreserveAndComments,
      (_match, preserved) => (preserved !== undefined ? preserved : '')
    );
  }

  if (HASH_FAMILY.has(ext)) {
    let text = content.replace(
      PATTERNS.hashPreserveAndComments,
      (_match, preservedStr, shebang) => {
        if (preservedStr) return preservedStr;
        if (shebang) return shebang;
        return '';
      }
    );
    if (ext === '.py') {
      text = text.replace(PATTERNS.pyDocDouble, '').replace(PATTERNS.pyDocSingle, '');
    }
    return text;
  }

  if (ext === '.html' || ext === '.vue' || ext === '.xml') {
    return content.replace(PATTERNS.htmlComments, '');
  }

  return content;
};

export const compressWhitespace = (content: string): string => {
  return content
    .replace(PATTERNS.trailingSpaces, '')
    .replace(PATTERNS.multiNewlines, '\n\n')
    .trim();
};

export const refinePackageJson = (content: string): string => {
  try {
    const pkg = JSON.parse(content);
    return JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      type: pkg.type,
      workspaces: pkg.workspaces,
      main: pkg.main,
      module: pkg.module,
      types: pkg.types || pkg.typings,
      exports: pkg.exports,
      bin: pkg.bin,
      scripts: pkg.scripts,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
      peerDependencies: pkg.peerDependencies,
    }, null, 2);
  } catch {
    return content;
  }
};

export const stripLicenseHeaders = (code: string): string => {
  return code.replace(PATTERNS.licenseHeaders, '').trimStart();
};

export const stubSvgPaths = (content: string, filePath: string): string => {
  if (PATTERNS.svgTargetExt.test(filePath)) {
    return content.replace(PATTERNS.svgPaths, 'd="/* [SVG PATH DATA] */"');
  }
  return content;
};

export const compactTailwindClasses = (code: string): string => {
  return code.replace(PATTERNS.tailwindClassName, (match, quote, classes) => {
    const list = classes.trim().split(/\s+/);
    if (list.length > 14) {
      return `className=${quote}${list.slice(0, 8).join(' ')} /* ...styles (${list.length - 8} more) */${quote}`;
    }
    return match;
  });
};

export const compactSupabaseTypes = (content: string, filePath: string): string => {
  if (filePath.endsWith('database.types.ts') || filePath.endsWith('supabase.ts')) {
    return content
      .replace(PATTERNS.supabaseRelationships, 'Relationships: []')
      .replace(PATTERNS.supabaseInsert, '/* [Insert definition] */')
      .replace(PATTERNS.supabaseUpdate, '/* [Update definition] */');
  }
  return content;
};

export const detectBoundary = (code: string): 'client' | 'server' | 'edge' | null => {
  const head = code.slice(0, 300);
  if (PATTERNS.boundaryClient.test(head)) return 'client';
  if (PATTERNS.boundaryServer.test(head)) return 'server';
  if (PATTERNS.boundaryEdge.test(head)) return 'edge';
  return null;
};

export const optimizeContent = (
  content: string,
  filePath: string,
  options: { removeComments?: boolean; removeExtraWhitespace?: boolean } = {}
): { content: string; redactedSecretsCount: number } => {
  let result = content;

  if (filePath.endsWith('package.json')) {
    result = refinePackageJson(result);
  }
  result = compactSupabaseTypes(result, filePath);
  if (TAILWIND_TARGET.test(filePath)) {
    result = compactTailwindClasses(result);
  }
  if (options.removeComments) {
    result = stripComments(result, filePath);
  }
  result = stripLicenseHeaders(result);
  result = stubSvgPaths(result, filePath);
  if (options.removeExtraWhitespace) {
    result = compressWhitespace(result);
  }

  const secretResult = scanAndRedactSecrets(result);

  return {
    content: secretResult.content.trim(),
    redactedSecretsCount: secretResult.redactedCount,
  };
};
