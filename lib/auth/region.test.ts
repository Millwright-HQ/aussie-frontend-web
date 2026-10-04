import { afterEach, describe, expect, it, vi } from 'vitest';
import { awsRegion } from './config';

describe('awsRegion', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the region in the pool id, not the platform AWS_REGION (Vercel sets us-east-1)', () => {
    vi.stubEnv('AWS_REGION', 'us-east-1');
    vi.stubEnv('ADMIN_POOL_ID', 'ap-south-1_1alnFx46N');
    expect(awsRegion()).toBe('ap-south-1');
  });

  it('falls back to the customer pool, then to ap-south-1', () => {
    vi.stubEnv('ADMIN_POOL_ID', '');
    vi.stubEnv('CUSTOMER_POOL_ID', 'eu-west-2_abc');
    expect(awsRegion()).toBe('eu-west-2');
    vi.stubEnv('CUSTOMER_POOL_ID', '');
    expect(awsRegion()).toBe('ap-south-1');
  });

  it('keeps AWS_REGION for the local emulator', () => {
    vi.stubEnv('COGNITO_ENDPOINT', 'http://localhost:4566');
    vi.stubEnv('AWS_REGION', 'us-east-1');
    expect(awsRegion()).toBe('us-east-1');
  });
});
