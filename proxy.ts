import { NextResponse, type NextRequest } from 'next/server';
import type { Audience } from './lib/auth/config';
import { cookieNames, cookiePath } from './lib/auth/cookies';
import { type CookieChange, refreshIfNeeded } from './lib/auth/refresh';

/** Admin pages reachable while signed out (the multi-step sign-in). */
const ADMIN_PUBLIC = ['/admin/login'];
/** Customer pages that need a session. Sign-in/up/verify/reset pages stay public. */
const CUSTOMER_PROTECTED = /^\/account(\/(welcome|addresses|security))?\/?$/;

/**
 * Runs before every page request:
 * 1. Refreshes expiring Cognito access tokens (pages can't set cookies while rendering) and
 *    passes the new cookie to this same request.
 * 2. Redirects signed-out users away from protected pages. This is UX only: every page verifies
 *    the token itself, and the API authorises every call (JWT authorizer + AccessGuard).
 * 3. Sets a per-request nonce-based Content-Security-Policy (docs/SECURITY.md §4).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const audience: Audience = isAdmin ? 'admin' : 'customer';
  const needsSession = isAdmin
    ? !ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    : CUSTOMER_PROTECTED.test(pathname);

  // Customers: refresh on any storefront page only if they have a session (keeps the header accurate).
  const hasRefresh = request.cookies.has(cookieNames(audience).refresh);
  let changes: CookieChange[] | null = [];
  if (needsSession || (!isAdmin && hasRefresh)) changes = await refreshIfNeeded(request, audience);

  if (changes === null && needsSession) {
    const login = new URL(isAdmin ? '/admin/login' : '/account/sign-in', request.url);
    login.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(login);
    clearCookies(redirect, audience);
    return redirect;
  }

  for (const c of changes ?? []) request.cookies.set(c.name, c.value);

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const c of changes ?? []) response.cookies.set(c.name, c.value, c.options);
  if (changes === null && hasRefresh) clearCookies(response, audience); // dead session on a public page
  response.headers.set('Content-Security-Policy', csp);
  if (isAdmin) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

function clearCookies(res: NextResponse, a: Audience) {
  for (const name of Object.values(cookieNames(a))) {
    res.cookies.set(name, '', { path: cookiePath(a), maxAge: 0 });
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const api = process.env.NEXT_PUBLIC_API_URL ?? '';
  // A CSP source with a path only matches sub-paths when it ends with "/" (otherwise it matches that
  // exact path). The local CDN URL is a bucket path; on AWS it is a bare CloudFront origin.
  const cdnRaw = process.env.NEXT_PUBLIC_CDN_URL ?? '';
  const cdn =
    cdnRaw && !cdnRaw.endsWith('/') && new URL(cdnRaw).pathname !== '/' ? `${cdnRaw}/` : cdnRaw;
  const uploads = process.env.NEXT_PUBLIC_UPLOAD_ORIGIN ?? '';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // next/image (fill/sizes) positions images with style ATTRIBUTES. These can't execute script;
    // <style> elements stay nonce-only. docs/SECURITY.md §4.
    `style-src-attr 'unsafe-inline'`,
    ['img-src', "'self'", 'blob:', 'data:', cdn].filter(Boolean).join(' '),
    `font-src 'self'`,
    ['connect-src', "'self'", api, uploads].filter(Boolean).join(' '),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export const config = {
  matcher: [
    // All pages except static assets and prefetches.
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
