import { describe, expect, it } from 'vitest';
import {
  centsToRupees,
  describeDiscount,
  describeScope,
  fromColomboInput,
  rupeesToCents,
  toColomboInput,
} from './promotions';

describe('promotion helpers', () => {
  it('describes discounts and scopes', () => {
    expect(describeDiscount({ kind: 'PERCENT', value: 15 })).toBe('15% off');
    expect(describeDiscount({ kind: 'FREE_DELIVERY', value: 0 })).toBe('Free delivery');
    expect(describeScope({ scope: 'ORDER', targetIds: [] })).toBe('Whole order');
    expect(describeScope({ scope: 'PRODUCTS', targetIds: ['a'] })).toBe('1 product');
    expect(describeScope({ scope: 'CATEGORIES', targetIds: ['a', 'b'] })).toBe('2 categories');
  });

  it('converts Sri Lanka local time to ISO and back', () => {
    expect(fromColomboInput('2026-11-01T00:00')).toBe('2026-10-31T18:30:00.000Z');
    expect(toColomboInput('2026-10-31T18:30:00.000Z')).toBe('2026-11-01T00:00');
    expect(fromColomboInput('')).toBe('');
    expect(toColomboInput(undefined)).toBe('');
  });

  it('converts rupees and cents', () => {
    expect(rupeesToCents('1,500.50')).toBe(150_050);
    expect(rupeesToCents('')).toBeUndefined();
    expect(Number.isNaN(rupeesToCents('abc'))).toBe(true);
    expect(centsToRupees(150_000)).toBe('1500');
    expect(centsToRupees(undefined)).toBe('');
  });
});
