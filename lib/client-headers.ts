import 'server-only';
import { headers } from 'next/headers';

/**
 * Who is really behind this request, for the API's audit trail. The API only sees this website's
 * server; these headers carry the visitor's address and browser. The API treats them as a note
 * ("reported by the website"), never as proof of identity.
 */
export async function clientHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers();
    const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim();
    const ua = (h.get('user-agent') ?? '').slice(0, 300);
    // Proves to the API's firewall that this call came from this website, so it can trust the
    // address above for rate limits. Unset until the firewall is switched on (docs/SECURITY.md §10).
    const siteKey = process.env.EDGE_SITE_KEY;
    return {
      ...(ip ? { 'x-aussie-client-ip': ip.slice(0, 64) } : {}),
      ...(ua ? { 'x-aussie-client-ua': ua } : {}),
      ...(siteKey ? { 'x-aussie-site-key': siteKey } : {}),
    };
  } catch {
    return {}; // outside a request (build, cache revalidation)
  }
}
