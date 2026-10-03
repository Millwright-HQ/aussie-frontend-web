import { describe, expect, it } from 'vitest';
import { formatLkPhone, formatLkr } from './format';

describe('formatLkr', () => {
  it('formats cents as rupees', () => {
    expect(formatLkr(245000)).toBe('Rs 2,450.00');
    expect(formatLkr(0)).toBe('Rs 0.00');
    expect(formatLkr(5)).toBe('Rs 0.05');
  });
});

describe('formatLkPhone', () => {
  it('formats LK mobiles for display', () => {
    expect(formatLkPhone('+94771234567')).toBe('077 123 4567');
    expect(formatLkPhone('+441234')).toBe('+441234');
  });
});
