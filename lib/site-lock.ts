import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SiteLockPublic } from '@aussie/shared-types';
import { authSecret } from './auth/config';

/** Cookie that remembers a visitor entered the launch password (value = version.signature). */
export const UNLOCK_COOKIE = 'ozara_unlock';
export const UNLOCK_MAX_AGE = 60 * 60 * 24 * 30;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const CACHE_MS = 10_000;
let cached: { at: number; lock: SiteLockPublic } | undefined;

/**
 * Is the shop locked until launch? Read by the proxy on every storefront request, so it is cached
 * for a few seconds. If the content service cannot be reached the shop stays open (never lock
 * customers out because of an outage).
 */
export async function readSiteLock(): Promise<SiteLockPublic> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.lock;
  let lock: SiteLockPublic = { enabled: false };
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/v1/content/site-lock`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3_000),
      });
      if (res.ok) lock = (await res.json()) as SiteLockPublic;
    } catch {
      return cached?.lock ?? lock;
    }
  }
  cached = { at: Date.now(), lock };
  return lock;
}

const sign = (version: string) =>
  createHmac('sha256', authSecret()).update(`site-unlock:${version}`).digest('base64url');

export const unlockToken = (version: string) => `${version}.${sign(version)}`;

/** True when the cookie was issued for the current password (changing the password revokes it). */
export function isUnlocked(cookie: string | undefined, version: string | undefined): boolean {
  if (!cookie || !version) return false;
  const expected = Buffer.from(unlockToken(version));
  const given = Buffer.from(cookie);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
