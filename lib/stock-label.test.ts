import { describe, expect, it } from 'vitest';
import { availabilityLabel, availableUnits } from './stock-label';

describe('stock labels', () => {
  it('shows the exact count, with urgency when stock is low', () => {
    expect(availabilityLabel({ status: 'in', count: 40 })).toBe('40 in stock');
    expect(availabilityLabel({ status: 'in', count: 6 })).toBe('6 in stock');
    expect(availabilityLabel({ status: 'low', count: 3 })).toBe('Only 3 in stock: order soon');
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
