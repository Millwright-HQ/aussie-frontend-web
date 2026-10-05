import type { Audience } from './config';
import { isSecureCookies } from './config';

/** Admin cookies are scoped to /admin so they are never sent to storefront pages. */
export const cookiePath = (a: Audience) => (a === 'admin' ? '/admin' : '/');

export const cookieNames = (a: Audience) => ({
  access: `aussie_${a}_at`,
  refresh: `aussie_${a}_rt`,
  /** Short-lived sign-in/sign-up state (Cognito session, challenge, email). */
  flow: `aussie_${a}_flow`,
});

export const REFRESH_MAX_AGE = { admin: 8 * 3600, customer: 30 * 86400 } as const;
export const FLOW_MAX_AGE = 10 * 60;

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function cookieOptions(a: Audience, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookies(),
    sameSite: 'lax',
    path: cookiePath(a),
    maxAge,
  };
}

export interface AccessCookie {
  token: string;
  /** Access token expiry, epoch seconds. */
  exp: number;
  /**
   * Admins with the authenticator app on: set until the code is entered. Sealed inside the cookie,
   * so it cannot be removed from the browser; a session in this state is not a session
   * (`getSession` refuses it) and only the code page may use it.
   */
  mfa?: 'pending';
}

export interface RefreshCookie {
  refreshToken: string;
  /** Cognito username (UUID) needed for SECRET_HASH on refresh. */
  username: string;
  /** Carried to every refreshed access cookie (see AccessCookie.mfa). */
  mfa?: 'pending';
}
