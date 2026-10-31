import JSZip from 'jszip';

export interface GitHubRepoMeta {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export const parseGitHubSlug = (input: string): { owner: string; repo: string } => {
  const clean = input.trim().replace(/\/$/, '');
  const match = clean.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/i) || clean.match(/^([^\/]+)\/([^\/]+)$/i);
  if (!match) throw new Error('Please enter a valid GitHub repository (e.g. facebook/react)');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
};

export const getAuthHeaders = (token?: string, raw: boolean = false): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: raw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    const cleanToken = token.trim();
    headers.Authorization = cleanToken.startsWith('ghp_') || cleanToken.startsWith('github_pat_')
      ? `token ${cleanToken}`
      : `Bearer ${cleanToken}`;
  }
  return headers;
};

interface CachedZip {
  zip: JSZip;
  rootPrefix: string;
}
const repoZipCache = new Map<string, CachedZip>();

export const clearRepoZipCache = (sourceId: string) => {
  repoZipCache.delete(sourceId);
};

export const clearAllRepoZipCaches = () => {
  repoZipCache.clear();
};

export const setRepoZip = (sourceId: string, zip: JSZip, rootPrefix: string = '') => {
  repoZipCache.set(sourceId, { zip, rootPrefix });
};

export const hasRepoZip = (sourceId: string): boolean => {
  return repoZipCache.has(sourceId);
};

export const sanitizeArchivePath = (path: string): string => {
  if (!path) return '';
  return path
    .replace(/\\/g, '/') // Normalize Windows backslashes
    .split('/')
    // Remove empty segments, '.', '..', and prototype pollution keys
    // BUT preserve '.github', '.gitignore', '.eslintrc', etc.
    .filter(segment => segment && segment !== '.' && segment !== '..' && segment !== '__proto__' && segment !== 'prototype')
    .join('/');
};

/**
 * Parses GitHub API error responses into actionable, human-friendly messages.
 */
async function parseGitHubApiError(res: Response, hasToken: boolean): Promise<never> {
  let errorData: any = null;
  try {
    errorData = await res.json();
  } catch (_) {}

  const serverMsg = errorData?.message || '';
  const status = res.status;

  // 1. Invalid or Expired Token
  if (status === 401) {
    throw new Error(
      'Your GitHub Personal Access Token is invalid, expired, or revoked (HTTP 401). Please clear or update your token in the field below.'
    );
  }

  // 2. Forbidden (Rate Limits vs Permissions)
  if (status === 403) {
    const isRateLimit =
      serverMsg.toLowerCase().includes('rate limit') ||
      res.headers.get('x-ratelimit-remaining') === '0';

    if (isRateLimit) {
      if (hasToken) {
        throw new Error(
          'GitHub API rate limit exceeded for your token (5,000 req/hr). Please wait a few minutes or switch tokens.'
        );
      }
      throw new Error(
        "GitHub's public rate limit reached for your IP (60 req/hr). Add a free Personal Access Token below to get 5,000 requests/hour."
      );
    }

    throw new Error(
      `Access forbidden (HTTP 403): ${serverMsg || 'Your token lacks required permissions or the organization requires SAML SSO authorization.'}`
    );
  }

  // 3. Not Found (Public typo OR Private repo without token)
  if (status === 404) {
    if (hasToken) {
      throw new Error(
        'Repository not found (HTTP 404). Please verify the owner/repo spelling. If this repository is private, ensure your token has the "repo" scope enabled.'
      );
    }
    throw new Error(
      'Repository not found (HTTP 404). Please verify the owner/repo name. If this is a private repository, please supply a Personal Access Token below.'
    );
  }

  // 4. Empty Repository
  if (status === 409) {
    throw new Error('This GitHub repository is empty (no branches or commits found).');
  }

  // 5. GitHub Server Outages
  if (status >= 500) {
    throw new Error(`GitHub servers are currently experiencing issues (HTTP ${status}). Please try again in a few moments.`);
  }

  throw new Error(serverMsg ? `GitHub error: ${serverMsg} (HTTP ${status})` : `Failed to load repository (HTTP ${status})`);
}

/**
 * Attempts to download the repository as a single zipball and extract it into repoZipCache.
 * Returns { branch, tree } if successful, or throws if failed / unsupported.
 */
export const fetchRepoZipball = async (
  owner: string,
  repo: string,
  branch: string,
  token?: string,
  onRateLimit?: (remaining: number, limit: number) => void,
  sourceId?: string
): Promise<{ branch: string; tree: any[] }> => {
  const hasToken = Boolean(token && token.trim());
  const authHeaders = getAuthHeaders(token);

  let activeBranch = branch;
  if (!activeBranch) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: authHeaders });
    if (onRateLimit) readRateLimit(repoRes, onRateLimit);
    if (!repoRes.ok) {
      await parseGitHubApiError(repoRes, hasToken);
    }
    const data = await repoRes.json();
    activeBranch = data.default_branch;
  }

  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(activeBranch)}`;
  const zipRes = await fetch(zipUrl, { headers: authHeaders });
  if (onRateLimit) readRateLimit(zipRes, onRateLimit);
  if (!zipRes.ok) {
    await parseGitHubApiError(zipRes, hasToken);
  }

  const blob = await zipRes.blob();
  const zip = await JSZip.loadAsync(blob);

  // Find root directory prefix created by GitHub zipball (e.g. "owner-repo-sha/")
  let rootPrefix = '';
  for (const relativePath of Object.keys(zip.files)) {
    const slashIdx = relativePath.indexOf('/');
    if (slashIdx !== -1) {
      rootPrefix = relativePath.slice(0, slashIdx + 1);
      break;
    }
  }

  const tree: any[] = [];
  const entries = Object.keys(zip.files);
  for (const fullPath of entries) {
    const entry = zip.files[fullPath];
    if (entry.dir) continue;

    const relPath = rootPrefix && fullPath.startsWith(rootPrefix)
      ? fullPath.slice(rootPrefix.length)
      : fullPath;

    const cleanPath = sanitizeArchivePath(relPath);
    if (!cleanPath) continue;

    // Estimate or get uncompressed size
    const uncompressedSize = (entry as any)._data?.uncompressedSize || 1024;

    tree.push({
      path: cleanPath,
      type: 'blob',
      size: uncompressedSize,
      sha: `zip-${cleanPath}`,
      sourceId,
    });
  }

  if (sourceId) {
    setRepoZip(sourceId, zip, rootPrefix);
  }

  return { branch: activeBranch, tree };
};

export const fetchTreeData = async (
  owner: string,
  repo: string,
  branch: string,
  token?: string,
  onRateLimit?: (remaining: number, limit: number) => void,
  sourceId?: string,
  onStatusUpdate?: (msg: string) => void
) => {
  const hasToken = Boolean(token && token.trim());
  const authHeaders = getAuthHeaders(token);

  // 1. Resolve default branch if not supplied
  let activeBranch = branch;
  if (!activeBranch) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: authHeaders });
    if (onRateLimit) readRateLimit(repoRes, onRateLimit);

    if (!repoRes.ok) {
      await parseGitHubApiError(repoRes, hasToken);
    }

    const data = await repoRes.json();
    activeBranch = data.default_branch;
  }

  // 2. Attempt Zipball Streaming Flow first (Single stream, decompressed in browser memory)
  // Matching Gitingest / Repomix speed without routing code through third-party servers
  try {
    if (onStatusUpdate) onStatusUpdate('Streaming repository archive...');
    const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(activeBranch)}`;
    const zipRes = await fetch(zipballUrl, { headers: authHeaders });

    if (zipRes.ok) {
      const zipBuffer = await zipRes.arrayBuffer();
      if (onStatusUpdate) onStatusUpdate('Extracting repository in memory...');
      const zip = await JSZip.loadAsync(zipBuffer);

      // Find root directory prefix if present in GitHub zipball (e.g. "owner-repo-commitSha/")
      let rootPrefix = '';
      const zipEntryKeys = Object.keys(zip.files);
      if (zipEntryKeys.length > 0) {
        const firstEntry = zipEntryKeys[0];
        const slashIdx = firstEntry.indexOf('/');
        if (slashIdx !== -1) {
          const candidatePrefix = firstEntry.slice(0, slashIdx + 1);
          if (zipEntryKeys.every(k => k.startsWith(candidatePrefix))) {
            rootPrefix = candidatePrefix;
          }
        }
      }

      if (sourceId) {
        repoZipCache.set(sourceId, { zip, rootPrefix });
      }

      const tree: any[] = [];
      const MAX_TOTAL_FILES = 4000;

      for (const [relPath, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const relativePath = rootPrefix && relPath.startsWith(rootPrefix)
          ? relPath.slice(rootPrefix.length)
          : relPath;

        const cleanPath = sanitizeArchivePath(relativePath);
        if (!cleanPath) continue;

        const uncompressedSize = (entry as any)._data?.uncompressedSize || 1024;
        tree.push({
          path: cleanPath,
          type: 'blob',
          size: uncompressedSize,
          sha: `zip-${cleanPath}`,
          sourceId,
        });

        if (tree.length > MAX_TOTAL_FILES) {
          throw new Error(`Repository is too large (${tree.length}+ items). Please pack specific subdirectories.`);
        }
      }

      return { branch: activeBranch, tree };
    }
  } catch (zipErr) {
    console.warn('Zipball streaming encountered an issue or rate limit, falling back to Git Tree API:', zipErr);
  }

  // Fallback: Git Recursive Tree API
  if (onStatusUpdate) onStatusUpdate('Scanning repository tree...');
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(activeBranch)}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers: authHeaders });
  if (onRateLimit) readRateLimit(treeRes, onRateLimit);

  if (!treeRes.ok) {
    await parseGitHubApiError(treeRes, hasToken);
  }

  const treeData = await treeRes.json();
  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error('Invalid repository tree received from GitHub.');
  }

  // 3. Tree size guardrail
  const MAX_TOTAL_FILES = 4000;
  if (treeData.tree.length > MAX_TOTAL_FILES) {
    throw new Error(`Repository is too large (${treeData.tree.length} items). Please pack specific subdirectories.`);
  }

  const tree: any[] = [];
  for (const item of treeData.tree) {
    // Only process files ('blob'), skip directories ('tree')
    if (item.type !== 'blob') continue;

    const cleanPath = sanitizeArchivePath(item.path);
    if (!cleanPath) continue;

    tree.push({
      path: cleanPath,
      type: 'blob',
      size: item.size || 1024,
      sha: item.sha,
      sourceId,
    });
  }

  return { branch: activeBranch, tree };
};

export const fetchFileContent = async (
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token?: string,
  sourceId?: string
): Promise<string> => {
  // If the file came from a locally dropped ZIP archive, read from local memory
  if (sourceId && repoZipCache.has(sourceId)) {
    const { zip, rootPrefix } = repoZipCache.get(sourceId)!;
    const zipPath = rootPrefix ? `${rootPrefix}${filePath}` : filePath;
    const entry = zip.file(zipPath);
    if (entry) {
      return await entry.async('text');
    }
  }

  const authHeaders = getAuthHeaders(token);

  // Strategy 1: raw.githubusercontent.com (Fast, public CORS-enabled CDN)
  try {
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`,
      { headers: authHeaders }
    );
    if (rawRes.ok) return await rawRes.text();
  } catch (_) {}

  // Strategy 2: GitHub Contents API with raw media header (Works with private repos + tokens)
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  try {
    const apiRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      { headers: getAuthHeaders(token, true) }
    );
    if (apiRes.ok) return await apiRes.text();
    if (apiRes.status === 401 || apiRes.status === 403) {
      throw new Error(`Permission denied reading ${filePath} (HTTP ${apiRes.status})`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Permission denied')) throw err;
  }

  throw new Error(`Failed to read file: ${filePath}`);
};

const readRateLimit = (res: Response, cb: (rem: number, lim: number) => void) => {
  const remaining = res.headers.get('x-ratelimit-remaining');
  const limit = res.headers.get('x-ratelimit-limit');
  if (remaining && limit) cb(Number(remaining), Number(limit));
};
