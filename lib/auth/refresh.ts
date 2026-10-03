import type { NextRequest } from 'next/server';
import { refreshTokens } from './cognito';
import type { Audience } from './config';
import {
  type AccessCookie,
  cookieNames,
  cookieOptions,
  type CookieOptions,
  type RefreshCookie,
} from './cookies';
import { seal, unseal } from './seal';

export interface CookieChange {
  name: string;
  value: string;
  options: CookieOptions;
}

/** Refresh when the access token has less than this left, so a page never renders with an expiring token. */
const REFRESH_SKEW_SECONDS = 60;

/**
 * Called from proxy.ts (cookies can't be set during rendering). Returns the cookie changes to apply,
 * `[]` when nothing to do, or `null` when the session is gone (refresh refused, e.g. admin disabled).
 */
export async function refreshIfNeeded(
  req: NextRequest,
  a: Audience,
): Promise<CookieChange[] | null> {
  const names = cookieNames(a);
  const access = await unseal<AccessCookie>(names.access, req.cookies.get(names.access)?.value);
  if (access && access.exp - REFRESH_SKEW_SECONDS > Date.now() / 1000) return [];

  const refresh = await unseal<RefreshCookie>(names.refresh, req.cookies.get(names.refresh)?.value);
  if (!refresh) return access ? [] : null;

  try {
    const t = await refreshTokens(a, refresh.refreshToken, refresh.username);
    const exp = Math.floor(Date.now() / 1000) + t.expiresIn;
    return [
      {
        name: names.access,
        value: await seal(
          names.access,
          { token: t.accessToken, exp } satisfies AccessCookie,
          t.expiresIn,
        ),
        options: cookieOptions(a, t.expiresIn),
      },
    ];
  } catch {
    return null;
  }
}
