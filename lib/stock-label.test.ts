import { describe, expect, it } from 'vitest';
import { availabilityLabel, availableUnits } from './stock-label';

describe('stock labels', () => {
  it('never shows counts; only the last unit gets a message', () => {
    expect(availabilityLabel({ status: 'in', count: 40 })).toBe('');
    expect(availabilityLabel({ status: 'in', count: 6 })).toBe('');
    expect(availabilityLabel({ status: 'low', count: 3 })).toBe('');
    expect(availabilityLabel({ status: 'low', count: 1 })).toBe('Last one in stock: order soon');
    expect(availabilityLabel({ status: 'out' })).toBe('Sold out');
    expect(availabilityLabel(undefined)).toBe('');
  });

  it('limits what can be bought to what is in stock', () => {
    expect(availableUnits({ status: 'in', count: 7 })).toBe(7);
    expect(availableUnits({ status: 'low', count: 1 })).toBe(1);
    expect(availableUnits({ status: 'out' })).toBe(0);
    expect(availableUnits(undefined)).toBeUndefined();
  });
});
