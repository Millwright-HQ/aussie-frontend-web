import { MAX_ORDER_LINES, MAX_QTY_PER_LINE } from '@aussie/validation';
import { describe, expect, it } from 'vitest';
import { cartCount, withLine } from './cart-model';
import { statusHint, statusLabel, statusTone } from './order-format';

const line = (n: number, qty = 1) => ({ productId: `P${n}`, variantId: `V${n}`, qty });

describe('withLine', () => {
  it('adds a new line', () => {
    expect(withLine([], line(1, 2))).toEqual([line(1, 2)]);
  });

  it('merges quantity into an existing line, capped per line', () => {
    expect(withLine([line(1, 2)], line(1, 3))).toEqual([line(1, 5)]);
    expect(withLine([line(1, MAX_QTY_PER_LINE - 1)], line(1, 5))?.[0]?.qty).toBe(MAX_QTY_PER_LINE);
    expect(withLine([], line(1, 999))?.[0]?.qty).toBe(MAX_QTY_PER_LINE);
  });

  it('refuses a new line when the bag is full, but still merges into an existing one', () => {
    const full = Array.from({ length: MAX_ORDER_LINES }, (_, i) => line(i));
    expect(withLine(full, line(999))).toBeNull();
    expect(withLine(full, line(0, 2))?.[0]?.qty).toBe(3);
  });

  it('does not change the original bag', () => {
    const bag = [line(1)];
    withLine(bag, line(1, 2));
    expect(bag).toEqual([line(1)]);
  });
});

describe('cartCount', () => {
  it('counts items, not lines', () => {
    expect(cartCount([line(1, 2), line(2, 3)])).toBe(5);
    expect(cartCount([])).toBe(0);
  });
});

describe('order status wording', () => {
  const all = [
    'PENDING',
    'CONFIRMED',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ] as const;
  it('has a label, a hint and a tone for every status', () => {
    for (const s of all) {
      expect(statusLabel(s).length).toBeGreaterThan(2);
      expect(statusHint(s).length).toBeGreaterThan(10);
      expect(statusTone(s)).toMatch(/^bg-/);
    }
    expect(statusLabel('SHIPPED')).toBe('On the way');
  });
});
