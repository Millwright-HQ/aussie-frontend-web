import { describe, expect, it } from 'vitest';
import { promoCodeSchema, promotionInputSchema } from './promotions.js';

const base = {
  code: 'eid10',
  name: 'Eid',
  kind: 'PERCENT',
  value: 10,
  scope: 'ORDER',
};

describe('promotion schemas', () => {
  it('upper-cases codes and rejects odd ones', () => {
    expect(promoCodeSchema.parse(' eid-10 ')).toBe('EID-10');
    expect(promoCodeSchema.safeParse('a').success).toBe(false);
    expect(promoCodeSchema.safeParse('has space').success).toBe(false);
  });

  it('accepts a whole-order percentage code with no limits', () => {
    const p = promotionInputSchema.parse(base);
    expect(p).toMatchObject({ code: 'EID10', targetIds: [], active: true });
    expect(p.maxUses).toBeUndefined();
  });

  it('caps percentages and needs targets for product/category scope', () => {
    expect(promotionInputSchema.safeParse({ ...base, value: 95 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, scope: 'CATEGORIES' }).success).toBe(false);
    expect(
      promotionInputSchema.safeParse({
        ...base,
        scope: 'PRODUCTS',
        targetIds: ['01M3YEF9JM6SB09BZ34JP2A1XW'],
      }).success,
    ).toBe(true);
  });

  it('free delivery is whole-order with no amount; end must follow start', () => {
    expect(
      promotionInputSchema.safeParse({ ...base, kind: 'FREE_DELIVERY', value: 0 }).success,
    ).toBe(true);
    expect(
      promotionInputSchema.safeParse({ ...base, kind: 'FREE_DELIVERY', value: 5 }).success,
    ).toBe(false);
    expect(
      promotionInputSchema.safeParse({
        ...base,
        startsAt: '2026-11-02T00:00:00.000Z',
        endsAt: '2026-11-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
