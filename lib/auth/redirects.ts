// eslint-disable-next-line no-control-regex -- reject control characters in redirect targets
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Validates a post-sign-in redirect target: only same-site paths at or below `prefix`.
 * Blocks open redirects (`//evil.com`, `https://…`), look-alike prefixes (`/adminx`),
 * backslash tricks (`/admin\\evil.com`) and control characters.
 */
export function safeNext(value: unknown, prefix: '/admin' | '/account', fallback: string): string {
  if (typeof value !== 'string' || value.length > 512) return fallback;
  const underPrefix =
    value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`);
  if (!underPrefix) return fallback;
  if (value.includes('\\') || value.includes('//') || CONTROL_CHARS.test(value)) return fallback;
  return value;
}
