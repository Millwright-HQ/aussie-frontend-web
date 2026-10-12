/**
 * The Cognito username (the account's UUID) written in an access token.
 *
 * Renewing a session needs it: the app-client SECRET_HASH must be computed from this username, and
 * Cognito refuses the email address the person typed ("Unable to verify secret hash"). Using the
 * email signed everyone out the first time their access token ran out (15 minutes for admins).
 *
 * The token comes straight from Cognito over TLS and is only read here, never trusted for access:
 * every page and the API verify it properly.
 */
export function usernameFromAccessToken(accessToken: string): string | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { username?: unknown; sub?: unknown };
    const name = payload.username ?? payload.sub;
    return typeof name === 'string' && name ? name : undefined;
  } catch {
    return undefined;
  }
}
