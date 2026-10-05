import 'server-only';
import { API_URL } from '../api';
import { clientHeaders } from '../client-headers';

/**
 * Does this admin have the authenticator app switched on? Asked of the identity service with the
 * freshly issued access token (before any cookie is written). `null` = could not find out; the
 * caller must NOT sign the person in then (fail closed).
 */
export async function adminHasAuthenticator(accessToken: string): Promise<boolean | null> {
  try {
    const res = await fetch(`${API_URL}/v1/identity/admin/me`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: { authorization: `Bearer ${accessToken}`, ...(await clientHeaders()) },
    });
    if (!res.ok) return null;
    const me = (await res.json()) as { totpEnabled?: boolean };
    return me.totpEnabled === true;
  } catch {
    return null;
  }
}
