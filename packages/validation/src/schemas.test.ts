import { describe, expect, it } from 'vitest';
import { DISTRICTS } from './districts.js';
import {
  addressSchema,
  centsSchema,
  lkMobileSchema,
  paginationSchema,
  slugSchema,
} from './schemas.js';

describe('districts', () => {
  it('has all 25 districts with unique codes', () => {
    expect(DISTRICTS).toHaveLength(25);
    expect(new Set(DISTRICTS.map((d) => d.code)).size).toBe(25);
  });
});

describe('lkMobileSchema', () => {
  it.each(['0771234567', '077 123 4567', '+94771234567', '94771234567', '077-123-4567'])(
    'normalises %s',
    (input) => {
      expect(lkMobileSchema.parse(input)).toBe('+94771234567');
    },
  );

  it.each(['0112345678', '12345', '+9477123456', 'abc', '+94 77 123 45678'])(
    'rejects %s',
    (input) => {
      expect(lkMobileSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe('centsSchema', () => {
  it('rejects fractional and negative amounts', () => {
    expect(centsSchema.safeParse(10.5).success).toBe(false);
    expect(centsSchema.safeParse(-1).success).toBe(false);
    expect(centsSchema.safeParse(245000).success).toBe(true);
  });
});

describe('paginationSchema', () => {
  it('caps limit at 50 and defaults to 20', () => {
    expect(paginationSchema.parse({}).limit).toBe(20);
    expect(paginationSchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

describe('addressSchema', () => {
  it('rejects unknown districts', () => {
    const result = addressSchema.safeParse({
      fullName: 'Test User',
      phone: '0771234567',
      line1: '12 Main Street',
      city: 'Colombo 03',
      district: 'XXX',
    });
    expect(result.success).toBe(false);
  });
});

describe('slugSchema', () => {
  it.each(['matte-lipstick', 'spf50', 'a-b-c'])('accepts %s', (s) => {
    expect(slugSchema.safeParse(s).success).toBe(true);
  });
  it.each(['-lead', 'trail-', 'dou--ble', 'Upper', 'sp ace'])('rejects %s', (s) => {
    expect(slugSchema.safeParse(s).success).toBe(false);
  });
});
