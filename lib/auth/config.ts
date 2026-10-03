export type Audience = 'admin' | 'customer';

export interface PoolConfig {
  poolId: string;
  clientId: string;
  clientSecret: string;
  /** Expected `iss` claim. */
  issuer: string;
  /** Where to fetch signing keys (differs from issuer only on the local emulator). */
  jwksUrl: string;
}

function env(name: string): string {
  // eslint-disable-next-line security/detect-object-injection -- name is a code constant
  const value = process.env[name];
  if (!value) throw new Error(`Missing server env ${name} (run pnpm local:deploy for local dev)`);
  return value;
}

/** Server-only Cognito settings. Never exposed through NEXT_PUBLIC_*. */
export function poolConfig(audience: Audience): PoolConfig {
  const p = audience === 'admin' ? 'ADMIN' : 'CUSTOMER';
  const issuer = env(`${p}_ISSUER`);
  return {
    poolId: env(`${p}_POOL_ID`),
    clientId: env(`${p}_CLIENT_ID`),
    clientSecret: env(`${p}_CLIENT_SECRET`),
    issuer,
    jwksUrl: process.env[`${p}_JWKS_URL`] ?? `${issuer}/.well-known/jwks.json`,
  };
}

/** Local emulator endpoint; unset on AWS. */
export const cognitoEndpoint = () => process.env.COGNITO_ENDPOINT || undefined;
export const awsRegion = () => process.env.AWS_REGION ?? 'ap-south-1';

/** 32-byte key for sealing auth cookies (AES-256-GCM). */
export function authSecret(): Uint8Array {
  const key = Buffer.from(env('AUTH_SECRET'), 'base64url');
  if (key.length !== 32) throw new Error('AUTH_SECRET must be 32 bytes (base64url)');
  return new Uint8Array(key);
}

export const isSecureCookies = () => process.env.NODE_ENV === 'production';
