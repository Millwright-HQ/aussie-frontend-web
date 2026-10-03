import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('AUTH_SECRET', Buffer.alloc(32, 7).toString('base64url'));

// Plain-function indirection: Vitest 5 fails a test when a vi.fn() mock throws, even if the code
// under test catches it, and catching is exactly the behaviour we need to verify here.
type Refresh = (
  a: string,
  token: string,
  username: string,
) => Promise<{ accessToken: string; expiresIn: number }>;
let refreshImpl: Refresh = async () => ({ accessToken: '', expiresIn: 0 });
const refreshCalls: Parameters<Refresh>[] = [];
vi.mock('./cognito', () => ({
  refreshTokens: (...args: Parameters<Refresh>) => {
    refreshCalls.push(args);
    return refreshImpl(...args);
  },
}));

const { seal, unseal } = await import('./seal');
const { safeNext } = await import('./redirects');
const { refreshIfNeeded } = await import('./refresh');
const { cookieNames } = await import('./cookies');

describe('cookie sealing', () => {
  it('round-trips data for the same purpose', async () => {
    const v = await seal('a', { token: 't', exp: 1 }, 60);
    expect(await unseal<{ token: string }>('a', v)).toMatchObject({ token: 't' });
  });

  it('rejects a value sealed for another cookie (no swapping refresh ↔ access)', async () => {
    const v = await seal('aussie_admin_rt', { refreshToken: 'r' }, 60);
    expect(await unseal('aussie_admin_at', v)).toBeNull();
  });

  it('rejects tampered or foreign values', async () => {
    const v = await seal('a', { x: 1 }, 60);
    const tampered = v.slice(0, -4) + (v.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(await unseal('a', tampered)).toBeNull();
    expect(await unseal('a', 'not-a-jwe')).toBeNull();
    expect(await unseal('a', undefined)).toBeNull();
  });

  it('does not expose plaintext', async () => {
    const v = await seal('a', { token: 'super-secret-access-token' }, 60);
    expect(v).not.toContain('super-secret');
    expect(Buffer.from(v.split('.').join(''), 'base64url').toString()).not.toContain(
      'super-secret',
    );
  });
});

describe('safeNext (open redirect guard)', () => {
  it.each(['/admin', '/admin/admins', '/admin/customers?cursor=abc'])('allows %s', (v) => {
    expect(safeNext(v, '/admin', '/admin')).toBe(v);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/admin//evil.com',
    '/adminx',
    '/admin\\evil.com',
    '/account',
    '/admin/\nSet-Cookie:x',
    'javascript:alert(1)',
    123,
    undefined,
  ])('rejects %s', (v) => {
    expect(safeNext(v, '/admin', '/admin')).toBe('/admin');
  });
});

describe('refreshIfNeeded', () => {
  const names = cookieNames('admin');
  const req = (cookies: Record<string, string>) =>
    ({
      cookies: { get: (n: string) => (n in cookies ? { value: cookies[n] } : undefined) },
    }) as never;

  beforeEach(() => {
    refreshCalls.length = 0;
  });

  it('does nothing while the access token is fresh', async () => {
    const at = await seal(names.access, { token: 't', exp: Date.now() / 1000 + 600 }, 600);
    expect(await refreshIfNeeded(req({ [names.access]: at }), 'admin')).toEqual([]);
    expect(refreshCalls).toHaveLength(0);
  });

  it('refreshes an expiring token using the stored username', async () => {
    const at = await seal(names.access, { token: 't', exp: Date.now() / 1000 + 10 }, 60);
    const rt = await seal(names.refresh, { refreshToken: 'r', username: 'uuid-1' }, 60);
    refreshImpl = async () => ({ accessToken: 'new', expiresIn: 900 });
    const changes = await refreshIfNeeded(
      req({ [names.access]: at, [names.refresh]: rt }),
      'admin',
    );
    expect(refreshCalls).toEqual([['admin', 'r', 'uuid-1']]);
    expect(changes?.[0]?.name).toBe(names.access);
    expect(changes?.[0]?.options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/admin',
    });
    expect(await unseal<{ token: string }>(names.access, changes?.[0]?.value)).toMatchObject({
      token: 'new',
    });
  });

  it('ends the session when Cognito refuses the refresh (e.g. admin disabled)', async () => {
    const rt = await seal(names.refresh, { refreshToken: 'r', username: 'u' }, 60);
    refreshImpl = async () => {
      throw Object.assign(new Error('Refresh Token has been revoked'), {
        name: 'NotAuthorizedException',
      });
    };
    expect(await refreshIfNeeded(req({ [names.refresh]: rt }), 'admin')).toBeNull();
  });

  it('treats no cookies as signed out', async () => {
    expect(await refreshIfNeeded(req({}), 'admin')).toBeNull();
  });
});
