// src/utils/secretScanner.ts

export interface SecretScanResult {
  content: string;
  redactedCount: number;
}

/**
 * Common high-risk API key and private credential patterns:
 * - OpenAI keys: sk-(?:proj-)?[A-Za-z0-9_-]{32,}
 * - Anthropic keys: sk-ant-[A-Za-z0-9_-]{32,}
 * - AWS Access Keys: AKIA[0-9A-Z]{16}
 * - Google API Keys: AIza[0-9A-Za-z-_]{35}
 * - Stripe Keys: (?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}
 * - Private Keys: -----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/g,
  /sk-ant-[A-Za-z0-9_-]{32,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z-_]{35}\b/g,
  /\b(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/g,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
];

export const scanAndRedactSecrets = (content: string): SecretScanResult => {
  if (!content) {
    return { content: '', redactedCount: 0 };
  }

  let sanitized = content;
  let totalRedacted = 0;

  for (const pattern of SECRET_PATTERNS) {
    // Reset pattern state
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, () => {
      totalRedacted++;
      return '[REDACTED_API_KEY]';
    });
  }

  return {
    content: sanitized,
    redactedCount: totalRedacted,
  };
};
