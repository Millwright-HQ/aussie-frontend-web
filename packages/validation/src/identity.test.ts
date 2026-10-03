import { describe, expect, it } from 'vitest';
import {
  addressSchema,
  adminPasswordSchema,
  customerPasswordSchema,
  profileUpdateSchema,
  roleInputSchema,
  signUpSchema,
} from './index.js';

describe('password policies (must match Cognito)', () => {
  it('customers: 10+ chars with lower, upper, digit, symbol', () => {
    expect(customerPasswordSchema.safeParse('Abcdef12!x').success).toBe(true);
    for (const bad of ['Abcdef12!', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefghi!', 'Abcdefghi1']) {
      expect(customerPasswordSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('admins need 12+ characters', () => {
    expect(adminPasswordSchema.safeParse('Abcdef12!xyz').success).toBe(true);
    expect(adminPasswordSchema.safeParse('Abcdef12!xy').success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const ok = {
    name: 'Amaya Silva',
    email: ' Amaya@Example.COM ',
    password: 'Abcdef12!x',
    acceptTerms: true,
  };

  it('normalises email and defaults marketing opt-in to false', () => {
    const r = signUpSchema.parse(ok);
    expect(r.email).toBe('amaya@example.com');
    expect(r.marketingOptIn).toBe(false);
  });

  it('requires accepting the terms', () => {
    expect(signUpSchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(signUpSchema.safeParse({ ...ok, isAdmin: true }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('turns empty form fields into explicit clears', () => {
    expect(profileUpdateSchema.parse({ phone: '', birthday: '' })).toEqual({
      phone: null,
      birthday: null,
    });
  });

  it('normalises the mobile and rejects future birthdays', () => {
    expect(profileUpdateSchema.parse({ phone: '077 123 4567' }).phone).toBe('+94771234567');
    expect(profileUpdateSchema.safeParse({ birthday: '2999-01-01' }).success).toBe(false);
  });

  it('cannot change email, sub or anything else', () => {
    expect(profileUpdateSchema.safeParse({ email: 'x@y.lk' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ sub: 'other' }).success).toBe(false);
  });
});

describe('addressSchema', () => {
  it('treats empty optional fields as absent', () => {
    const r = addressSchema.parse({
      fullName: 'Amaya',
      phone: '0771234567',
      line1: '42 Flower Road',
      line2: '',
      city: 'Colombo',
      district: 'CMB',
      postalCode: '',
      notes: '  ',
    });
    expect(r.line2).toBeUndefined();
    expect(r.postalCode).toBeUndefined();
    expect(r.notes).toBeUndefined();
  });
});

describe('roleInputSchema', () => {
  it('accepts known permissions only', () => {
    expect(
      roleInputSchema.safeParse({ name: 'Packers', permissions: ['order:read'] }).success,
    ).toBe(true);
    expect(
      roleInputSchema.safeParse({ name: 'Bad', permissions: ['order:delete-all'] }).success,
    ).toBe(false);
    expect(roleInputSchema.safeParse({ name: 'Empty', permissions: [] }).success).toBe(false);
  });
});
