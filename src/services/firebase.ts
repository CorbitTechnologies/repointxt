// src/services/firebase.ts

// In-memory queue for events triggered before Firebase finishes idle loading
const eventQueue: Array<{ name: string; params?: Record<string, any> }> = [];
const crashQueue: Array<{ error: string; fatal: boolean; context?: Record<string, any> }> = [];

let isInitialized = false;
let logEventFn: any = null;
let analyticsInstance: any = null;

// Initialize Firebase ONLY when the browser is idle (zero impact on initial paint)
const initFirebase = async () => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // If no Firebase keys exist (e.g. open-source fork, local dev), exit silently.
  // All trackEvent() and logCrash() calls will safely no-op.
  if (!apiKey || !projectId) {
    return;
  }

  try {
    const [{ initializeApp }, { getAnalytics, logEvent, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ]);

    const firebaseConfig = {
      apiKey,
      projectId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };

    const app = initializeApp(firebaseConfig);
    const supported = await isSupported();

    if (supported) {
      analyticsInstance = getAnalytics(app);
      logEventFn = logEvent;

      // Flush queued events
      while (eventQueue.length > 0) {
        const item = eventQueue.shift()!;
        logEventFn(analyticsInstance, item.name, sanitizePayload(item.params));
      }

      while (crashQueue.length > 0) {
        const item = crashQueue.shift()!;
        logEventFn(analyticsInstance, 'app_exception', {
          description: item.error,
          fatal: item.fatal,
          ...sanitizePayload(item.context),
        });
      }
    }
  } catch (err) {
    console.warn('Firebase lazy initialization deferred or blocked:', err);
  }
};

// Trigger initialization strictly during idle time
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => initFirebase(), { timeout: 3500 });
  } else {
    setTimeout(initFirebase, 2000);
  }
}

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

function sanitizePayload(obj?: Record<string, any>): Record<string, any> | undefined {
  if (!obj) return undefined;
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Never send file content or secrets to Google Analytics
    if (key === 'content' || key === 'code' || key === 'token' || key === 'githubToken') {
      continue;
    }
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value).slice(0, 250); // clamp length
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Non-blocking Fire-and-Forget Event Tracker
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  const safeParams = sanitizePayload(params);
  if (logEventFn && analyticsInstance) {
    try {
      logEventFn(analyticsInstance, eventName, safeParams);
    } catch (_) {}
  } else {
    // Store in small bounded memory queue until Firebase loads
    if (eventQueue.length < 50) {
      eventQueue.push({ name: eventName, params: safeParams });
    }
  }
};

/**
 * Non-blocking Safe Crash Logger (Scrubbed)
 */
export const logCrash = (error: Error | unknown, fatal: boolean = false, context?: Record<string, any>) => {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const cleanMsg = sanitizeString(rawMsg).slice(0, 300);
  const safeContext = sanitizePayload(context);

  if (logEventFn && analyticsInstance) {
    try {
      logEventFn(analyticsInstance, 'app_exception', {
        description: cleanMsg,
        fatal,
        ...safeContext,
      });
    } catch (_) {}
  } else {
    if (crashQueue.length < 20) {
      crashQueue.push({ error: cleanMsg, fatal, context: safeContext });
    }
  }
};

/**
 * Performance Trace Helper
 * Non-blocking measure helper that falls back gracefully if performance isn't loaded
 */
export const measurePerformance = async <T>(_traceName: string, task: () => Promise<T>): Promise<T> => {
  return task();
};

/**
 * Key Event Outbound Trackers for Attribution & Funnel Conversion
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
