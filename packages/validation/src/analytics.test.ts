import { describe, expect, it } from 'vitest';
import { analyticsQuerySchema, visitEventSchema } from './analytics.js';

const base = {
  type: 'view',
  vid: 'abcDEF123456',
  path: '/shop',
  device: 'mobile',
  browser: 'chrome',
  system: 'android',
};

describe('analytics schemas', () => {
  it('accepts a page view and normalises case', () => {
    const t = visitEventSchema.parse({ ...base, ref: 'Instagram.com', country: 'lk' });
    expect(t).toMatchObject({ ref: 'instagram.com', country: 'LK' });
  });

  it('only counts known pages', () => {
    for (const path of ['/', '/p/lipstick-red', '/c/skin-care', '/order/placed']) {
      expect(visitEventSchema.safeParse({ ...base, path }).success).toBe(true);
    }
    for (const path of ['/admin', '/p/UPPER', '/random/thing', '/shop?x=1']) {
      expect(visitEventSchema.safeParse({ ...base, path }).success).toBe(false);
    }
  });

  it('needs a path for views and a product for product events', () => {
    expect(visitEventSchema.safeParse({ ...base, path: undefined }).success).toBe(false);
    expect(visitEventSchema.safeParse({ ...base, type: 'product', path: undefined }).success).toBe(
      false,
    );
    expect(
      visitEventSchema.safeParse({
        ...base,
        type: 'cart',
        path: undefined,
        productId: '01M3YEF9JM6SB09BZ34JP2A1P1',
      }).success,
    ).toBe(true);
  });

  it('rejects extra fields (so no personal data can sneak in)', () => {
    expect(visitEventSchema.safeParse({ ...base, ip: '1.2.3.4' }).success).toBe(false);
  });

  it('allows 7, 30 or 90 days only', () => {
    expect(analyticsQuerySchema.parse({}).days).toBe(30);
    expect(analyticsQuerySchema.parse({ days: '7' }).days).toBe(7);
    expect(analyticsQuerySchema.safeParse({ days: '14' }).success).toBe(false);
  });
});
