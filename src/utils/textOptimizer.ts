const PATTERNS = {
  jsBlockComments: /\/\*[\s\S]*?\*\//g,
  // Match // comments that are not part of http(s):// or preceded by a colon
  jsComments: /(^|[^\S\r\n]|;|\})\/\/(?!\/)[^\r\n]*/g,
  hashComments: /(^|[^\S\r\n])#[^\r\n]*/g,
  htmlComments: /<!--[\s\S]*?-->/g,
  pyDocDouble: /"""[\s\S]*?"""/g,
  pyDocSingle: /'''[\s\S]*?'''/g,
  multiNewlines: /\n{3,}/g,
  spacesRun: /[ \t]+/g,
};

const JS_FAMILY = new Set(['.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.swift', '.kt', '.php']);
const HASH_FAMILY = new Set(['.py', '.sh', '.bash', '.yaml', '.yml', '.toml', '.rb', '.dockerfile']);

export const stripComments = (content: string, filePath: string): string => {
  const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')).toLowerCase() : '';

  if (JS_FAMILY.has(ext)) {
    // Matches string literals and regex literals first to avoid replacing comments inside strings or regexes (e.g. /https:\/\//)
    return content.replace(
      /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|(?<![a-zA-Z0-9_$)\s])\/(?![/*])(?:\\.|[^/\n\\])+\/[gimsuy]*)|\/\*[\s\S]*?\*\/|(?:\s|^|\b)\/\/(?!\/)[^\r\n]*/g,
      (_match, preserved) => (preserved !== undefined ? preserved : '')
    );
  }

  if (HASH_FAMILY.has(ext)) {
    // Preserve string literals in YAML/TOML/Python (e.g. hex colors "#ffffff" or quoted text)
    let text = content.replace(
      /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*')|(^#!.*$)|((^|[^\S\r\n])#[^\r\n]*)/gm,
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
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
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
  return code.replace(
    /^(?:\/\*[\s\S]*?(?:copyright|license|all rights reserved)[\s\S]*?\*\/|\/\/(?:[^\n]*(?:copyright|license))[^\n]*\n*)+/i,
    ''
  ).trimStart();
};

export const stubSvgPaths = (content: string, filePath: string): string => {
  if (/\.(svg|tsx|jsx|html)$/i.test(filePath)) {
    // Replaces giant raw SVG geometry (path coordinates >= 40 chars) with lightweight stub
    return content.replace(/d="[MmLlHhVvCcSsQqTtAaZz0-9\s,\.\-]{40,}"/g, 'd="/* [SVG PATH DATA] */"');
  }
  return content;
};

// 1. Compress massive Tailwind strings (e.g. 50 utility classes down to essential layout)
export const compactTailwindClasses = (code: string): string => {
  return code.replace(/className=(["'`])([\s\S]*?)\1/g, (match, quote, classes) => {
    const list = classes.trim().split(/\s+/);
    // If class string has over 14 items, keep first 8 and truncate for AI logic comprehension
    if (list.length > 14) {
      return `className=${quote}${list.slice(0, 8).join(' ')} /* ...styles (${list.length - 8} more) */${quote}`;
    }
    return match;
  });
};

// 2. Compact Supabase generated database.types.ts
// Reduces 200KB of repetitive Row/Insert/Update definitions into concise table schemas
export const compactSupabaseTypes = (content: string, filePath: string): string => {
  if (filePath.endsWith('database.types.ts') || filePath.endsWith('supabase.ts')) {
    return content
      // Strip massive helper wrappers (Relationships, Row, Insert, Update boilerplates)
      .replace(/Relationships: \[[^\]]*\]/g, 'Relationships: []')
      .replace(/Insert: \{[\s\S]*?\}/g, '/* [Insert definition] */')
      .replace(/Update: \{[\s\S]*?\}/g, '/* [Update definition] */');
  }
  return content;
};

// 3. Detect Next.js Component Boundary (strictly when explicit directive is present)
export const detectBoundary = (code: string): 'client' | 'server' | 'edge' | null => {
  const head = code.slice(0, 300);
  if (/['"]use client['"]/i.test(head)) return 'client';
  if (/['"]use server['"]/i.test(head)) return 'server';
  if (/export const runtime = ['"]edge['"]/i.test(head)) return 'edge';
  return null;
};

export const optimizeContent = (
  content: string,
  filePath: string,
  options: { removeComments?: boolean; removeExtraWhitespace?: boolean } = {}
): string => {
  let result = content;

  if (filePath.endsWith('package.json')) {
    result = refinePackageJson(result);
  }
  result = compactSupabaseTypes(result, filePath);
  result = compactTailwindClasses(result);
  if (options.removeComments) {
    result = stripComments(result, filePath);
  }
  result = stripLicenseHeaders(result);
  result = stubSvgPaths(result, filePath);
  if (options.removeExtraWhitespace) {
    result = compressWhitespace(result);
  }

  return result.trim();
};
