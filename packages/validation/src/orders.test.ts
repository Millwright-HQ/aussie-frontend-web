import { describe, expect, it } from 'vitest';
import {
  bankDetailsSchema,
  checkoutSchema,
  paymentDecisionSchema,
  proofRequestSchema,
} from './orders.js';

const ID = '01M3YEF9JM6SB09BZ34JP2A1XW';
const shipping = {
  fullName: 'Nimali Perera',
  phone: '0771234567',
  line1: '12 Galle Road',
  city: 'Colombo',
  district: 'CMB',
};
const items = [{ productId: ID, variantId: ID, qty: 1 }];

describe('checkout payment method', () => {
  it('defaults to cash on delivery and accepts bank transfer', () => {
    expect(checkoutSchema.parse({ shipping, items }).paymentMethod).toBe('COD');
    expect(
      checkoutSchema.parse({ shipping, items, paymentMethod: 'BANK_TRANSFER' }).paymentMethod,
    ).toBe('BANK_TRANSFER');
  });
  it('rejects anything else', () => {
    expect(checkoutSchema.safeParse({ shipping, items, paymentMethod: 'CARD' }).success).toBe(
      false,
    );
  });
});

describe('bank details', () => {
  const ok = {
    accountName: 'Aussie Cosmetics',
    bankName: 'Commercial Bank',
    branch: 'Colombo 03',
    accountNumber: '1234 567 890',
  };
  it('accepts a normal account', () => {
    expect(bankDetailsSchema.safeParse(ok).success).toBe(true);
  });
  it('needs every field, a numeric account number and no extras', () => {
    expect(bankDetailsSchema.safeParse({ ...ok, branch: '' }).success).toBe(false);
    expect(bankDetailsSchema.safeParse({ ...ok, accountNumber: 'abc' }).success).toBe(false);
    expect(bankDetailsSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });
});

describe('payment slips', () => {
  const base = { orderNumber: 'ac-26-00042', phone: '0771234567' };
  it('accepts images and PDFs only', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      expect(proofRequestSchema.safeParse({ ...base, contentType }).success).toBe(true);
    }
    for (const contentType of ['text/html', 'image/svg+xml', 'application/zip']) {
      expect(proofRequestSchema.safeParse({ ...base, contentType }).success).toBe(false);
    }
  });
  it('normalises the order number', () => {
    expect(proofRequestSchema.parse({ ...base, contentType: 'image/png' }).orderNumber).toBe(
      'AC-26-00042',
    );
  });
});

describe('payment decision', () => {
  it('needs a reason to reject, not to confirm', () => {
    expect(paymentDecisionSchema.safeParse({ decision: 'confirm' }).success).toBe(true);
    expect(paymentDecisionSchema.safeParse({ decision: 'reject' }).success).toBe(false);
    expect(
      paymentDecisionSchema.safeParse({ decision: 'reject', note: 'Wrong amount' }).success,
    ).toBe(true);
  });
});
