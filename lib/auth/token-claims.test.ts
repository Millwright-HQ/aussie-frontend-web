import { describe, expect, it } from 'vitest';
import { usernameFromAccessToken } from './token-claims';

const token = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

describe('usernameFromAccessToken', () => {
  it('returns the Cognito username, not an email', () => {
    expect(usernameFromAccessToken(token({ username: 'uuid-1', sub: 'uuid-1' }))).toBe('uuid-1');
  });

  it('falls back to sub when there is no username claim', () => {
    expect(usernameFromAccessToken(token({ sub: 'uuid-2' }))).toBe('uuid-2');
  });

  it('returns undefined for anything that is not a token', () => {
    expect(usernameFromAccessToken('')).toBeUndefined();
    expect(usernameFromAccessToken('not-a-token')).toBeUndefined();
    expect(usernameFromAccessToken(token({}))).toBeUndefined();
  });
});
