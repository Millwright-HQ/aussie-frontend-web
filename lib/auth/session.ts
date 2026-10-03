import 'server-only';
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ClientContext } from './cognito';
import { type Audience, poolConfig } from './config';
import {
  type AccessCookie,
  cookieNames,
  cookieOptions,
  FLOW_MAX_AGE,
  REFRESH_MAX_AGE,
  type RefreshCookie,
} from './cookies';
import { seal, unseal } from './seal';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface Session {
  sub: string;
  accessToken: string;
  claims: JWTPayload & { permissions?: string; role?: string; client_id?: string };
}

/**
 * Verifies a Cognito ACCESS token: signature (pool JWKS), issuer, expiry, token_use and app
 * client. Pages call this on every request; the proxy only refreshes, it doesn't authorise.
 */
export async function verifyAccessToken(a: Audience, token: string): Promise<Session | null> {
  const cfg = poolConfig(a);
  let jwks = jwksCache.get(cfg.jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(cfg.jwksUrl));
    jwksCache.set(cfg.jwksUrl, jwks);
  }
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: cfg.issuer, clockTolerance: 5 });
    if (payload.token_use !== 'access' || payload.client_id !== cfg.clientId || !payload.sub)
      return null;
    return { sub: payload.sub, accessToken: token, claims: payload as Session['claims'] };
  } catch {
    return null;
  }
}

export async function getSession(a: Audience): Promise<Session | null> {
  const jar = await cookies();
  const access = await unseal<AccessCookie>(
    cookieNames(a).access,
    jar.get(cookieNames(a).access)?.value,
  );
  return access ? verifyAccessToken(a, access.token) : null;
}

/** For admin pages: a verified session or a redirect to sign-in. */
export async function requireAdminSession(): Promise<Session> {
  const session = await getSession('admin');
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireCustomerSession(next = '/account'): Promise<Session> {
  const session = await getSession('customer');
  if (!session) redirect(`/account/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

/** Server actions only (cookies can't be written while rendering). */
export async function writeSession(
  a: Audience,
  tokens: { AccessToken: string; ExpiresIn: number; RefreshToken?: string },
  username: string,
) {
  const jar = await cookies();
  const names = cookieNames(a);
  const exp = Math.floor(Date.now() / 1000) + tokens.ExpiresIn;
  jar.set(
    names.access,
    await seal(names.access, { token: tokens.AccessToken, exp }, tokens.ExpiresIn),
    cookieOptions(a, tokens.ExpiresIn),
  );
  if (tokens.RefreshToken) {
    const maxAge = a === 'admin' ? REFRESH_MAX_AGE.admin : REFRESH_MAX_AGE.customer;
    jar.set(
      names.refresh,
      await seal(
        names.refresh,
        { refreshToken: tokens.RefreshToken, username } satisfies RefreshCookie,
        maxAge,
      ),
      cookieOptions(a, maxAge),
    );
  }
  jar.delete({ name: names.flow, path: cookieOptions(a, 0).path });
}

export async function readRefresh(a: Audience): Promise<RefreshCookie | null> {
  const jar = await cookies();
  return unseal<RefreshCookie>(cookieNames(a).refresh, jar.get(cookieNames(a).refresh)?.value);
}

export async function clearSession(a: Audience) {
  const jar = await cookies();
  const path = cookieOptions(a, 0).path;
  for (const name of Object.values(cookieNames(a))) jar.delete({ name, path });
}

// ── Multi-step flow state (sign-in challenges, sign-up email) ────────────────

export interface FlowState {
  step: 'new-password' | 'mfa-setup' | 'totp' | 'verify-email' | 'reset-password';
  session?: string;
  username?: string;
  email?: string;
  totpSecret?: string;
  next?: string;
}

export async function writeFlow(a: Audience, state: FlowState) {
  const jar = await cookies();
  const name = cookieNames(a).flow;
  jar.set(name, await seal(name, state, FLOW_MAX_AGE), cookieOptions(a, FLOW_MAX_AGE));
}

export async function readFlow(a: Audience): Promise<FlowState | null> {
  const jar = await cookies();
  const name = cookieNames(a).flow;
  return unseal<FlowState>(name, jar.get(name)?.value);
}

/** Caller IP and user agent for Cognito triggers (login alerts). */
export async function clientContext(): Promise<ClientContext> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim();
  return { ip: ip || 'unknown', userAgent: (h.get('user-agent') ?? 'unknown').slice(0, 300) };
}

export { safeNext } from './redirects';
