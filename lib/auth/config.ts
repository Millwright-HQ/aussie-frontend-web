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
/**
 * Region of the Cognito pools. On AWS and Vercel `AWS_REGION` is set by the platform to wherever
 * the function runs (Vercel's `iad1` is `us-east-1`), which is not where the pools are, so it is
 * read from the pool id instead (`ap-south-1_AbC123`). Only the local emulator uses `AWS_REGION`.
 */
export function awsRegion(): string {
  if (cognitoEndpoint()) return process.env.AWS_REGION ?? 'ap-south-1';
  const poolId = process.env.ADMIN_POOL_ID || process.env.CUSTOMER_POOL_ID || '';
  const prefix = poolId.split('_')[0] ?? '';
  return /^[a-z0-9-]{6,25}$/.test(prefix) && prefix.includes('-') ? prefix : 'ap-south-1';
}

/** 32-byte key for sealing auth cookies (AES-256-GCM). */
export function authSecret(): Uint8Array {
  // nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_secret -- read from env, not hardcoded
  const key = Buffer.from(env('AUTH_SECRET'), 'base64url');
  if (key.length !== 32) throw new Error('AUTH_SECRET must be 32 bytes (base64url)');
  return new Uint8Array(key);
}

export const isSecureCookies = () => process.env.NODE_ENV === 'production';
