// src/services/telemetry.ts
//
// Vendor-neutral, opt-in analytics bridge.
//
// The tracking snippet itself is injected at build time from deployment
// environment variables (see `vite.config.ts`), never from source. In a fork or
// during local development no snippet exists and every call here becomes a
// no-op, so this file never contacts a third party on its own.
//
// Every payload is scrubbed of GitHub tokens and basic-auth credentials before
// it leaves the browser. Do not remove that step.

type EventParams = Record<string, string | number | boolean | undefined>;
type Gtag = (...args: unknown[]) => void;

const MAX_PARAM_LENGTH = 250;
const MAX_DESCRIPTION_LENGTH = 300;
/** Stop feeding the command shim if the network script was blocked. */
const MAX_COMMAND_QUEUE = 100;

/**
 * Resolves the global tag function created by the injected snippet.
 * Returns null when analytics is disabled, unconfigured, or blocked.
 */
const getGtag = (): Gtag | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { gtag?: Gtag; dataLayer?: unknown[] };
  if (typeof w.gtag !== 'function') return null;
  if (Array.isArray(w.dataLayer) && w.dataLayer.length > MAX_COMMAND_QUEUE) return null;
  return w.gtag;
};

// ── CREDENTIAL SAFETY & REDACTION ──
const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9_]{36,}/gi,
  /github_pat_[A-Za-z0-9_]{50,}/gi,
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /token\s+[A-Za-z0-9_]+/gi,
];

/**
 * Strips basic-auth credentials (e.g. https://token@github.com/org/repo) from URLs
 */
function stripUrlCredentials(url: string): string {
  try {
    if (url.includes('@')) {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      parsed.username = '';
      parsed.password = '';
      return parsed.toString();
    }
  } catch (_) {}
  return url.replace(/\/\/([^@]+)@/g, '//[REDACTED_AUTH]@');
}

/**
 * Strips GitHub Personal Access Tokens and passwords from any outgoing telemetry
 */
function sanitizeString(str: string): string {
  if (!str) return '';
  let sanitized = stripUrlCredentials(str);
  TOKEN_PATTERNS.forEach(regex => {
    sanitized = sanitized.replace(regex, '[REDACTED_SECRET]');
  });
  return sanitized;
}

function sanitizePayload(obj?: EventParams): EventParams | undefined {
  if (!obj) return undefined;
  const sanitized: EventParams = {};

  for (const [key, value] of Object.entries(obj)) {
    // Never send file content or secrets
    if (key === 'content' || key === 'code' || key === 'token' || key === 'githubToken') {
      continue;
    }
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value).slice(0, MAX_PARAM_LENGTH); // clamp length
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Fire-and-forget event tracker.
 */
export const trackEvent = (eventName: string, params?: EventParams) => {
  const gtag = getGtag();
  if (!gtag) return;
  try {
    gtag('event', eventName, sanitizePayload(params));
  } catch (_) {}
};

/**
 * Safe crash logger (scrubbed).
 */
export const logCrash = (error: Error | unknown, fatal: boolean = false, context?: EventParams) => {
  const gtag = getGtag();
  if (!gtag) return;
  const rawMsg = error instanceof Error ? error.message : String(error);
  try {
    gtag('event', 'app_exception', {
      description: sanitizeString(rawMsg).slice(0, MAX_DESCRIPTION_LENGTH),
      fatal,
      ...sanitizePayload(context),
    });
  } catch (_) {}
};

/**
 * Performance trace helper. Intentionally a pass-through: the browser's own
 * Performance API already records these, no beacon is needed.
 */
export const measurePerformance = async <T>(_traceName: string, task: () => Promise<T>): Promise<T> => {
  return task();
};

/**
 * Key outbound trackers for attribution & funnel conversion.
 */
export const trackCompanyOutbound = (location: 'header_brand' | 'footer' | 'cta_banner' | 'link') => {
  trackEvent('click_parent_company', {
    placement: location,
    destination: 'https://www.corbittechnologies.com/',
  });
};

export const trackGitHubOutbound = (location: 'header_star' | 'footer' | 'output_prompt') => {
  trackEvent('click_github_star', {
    placement: location,
    destination: 'https://github.com/CorbitTechnologies/repointxt',
  });
};

export const trackFileFryerOutbound = (location: 'selection_banner' | 'footer') => {
  trackEvent('click_filefryer_crosslink', {
    placement: location,
    destination: 'https://filefryer.com/',
  });
};
