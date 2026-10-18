import 'server-only';
import { createHmac } from 'node:crypto';
import type { TrackType } from '@aussie/shared-types';
import { headers } from 'next/headers';
import { API_URL } from './api';
import { getSession } from './auth/session';
import { parseAgent } from './user-agent';

export interface SiteEvent {
  type: TrackType;
  path?: string;
  productId?: string;
  /** Host the visitor came from (already reduced to a host name). */
  ref?: string;
  campaign?: string;
  /** The first page of a visit. */
  entry?: boolean;
}

/** Sri Lanka day (UTC+05:30, no daylight saving): the visitor hash changes when this does. */
const colomboDay = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/**
 * Reports a visit event to the content service. Anonymous by design: the visitor is a keyed hash of
 * address + browser + day (so it cannot be followed to the next day or turned back into an address),
 * and nothing else about the visitor is sent. Skips crawlers and signed-in staff browsing the shop.
 * Do Not Track / Global Privacy Control are deliberately not used to skip: nothing personal is stored
 * or shared, and many browsers send them by default, which would hide most real visitors.
 * Never throws and never slows the page down for long.
 */
export async function recordEvent(event: SiteEvent): Promise<void> {
  try {
    const secret = process.env.ANALYTICS_SECRET ?? process.env.AUTH_SECRET ?? '';
    if (!API_URL || !secret) return;
    const h = await headers();
    const ua = h.get('user-agent') ?? '';
    const agent = parseAgent(ua);
    if (agent.bot) return;
    if (await getSession('admin').catch(() => null)) return;

    const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim();
    const vid = createHmac('sha256', secret)
      .update(`${colomboDay()}|${ip}|${ua}`)
      .digest('base64url')
      .slice(0, 16);
    // Only when the host reports it (CloudFront and Vercel do); never looked up from the address.
    const country = (h.get('cloudfront-viewer-country') ?? h.get('x-vercel-ip-country') ?? '')
      .trim()
      .toUpperCase();

    await fetch(`${API_URL}/v1/content/track`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(2_500),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...event,
        vid,
        device: agent.device,
        browser: agent.browser,
        system: agent.system,
        ...(/^[A-Z]{2}$/.test(country) ? { country } : {}),
      }),
    });
  } catch {
    // Analytics must never break the shop.
  }
}
