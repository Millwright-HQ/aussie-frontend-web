import { EncryptJWT, jwtDecrypt } from 'jose';
import { authSecret } from './config';

/**
 * Encrypts cookie payloads (JWE, dir + A256GCM) so tokens and sign-in state are unreadable and
 * tamper-proof in the browser. `purpose` binds a value to one cookie so it can't be swapped.
 */
export async function seal(purpose: string, data: object, maxAgeSeconds: number): Promise<string> {
  return new EncryptJWT({ ...data, purpose })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .encrypt(authSecret());
}

export async function unseal<T extends object>(
  purpose: string,
  value: string | undefined,
): Promise<T | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, authSecret());
    if (payload.purpose !== purpose) return null;
    return payload as unknown as T;
  } catch {
    return null; // expired, tampered or encrypted with another key
  }
}
