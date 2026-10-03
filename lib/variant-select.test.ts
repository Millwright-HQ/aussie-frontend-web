import { describe, expect, it } from 'vitest';
import {
  axisValues,
  initialVariant,
  optionValue,
  pickVariant,
  valueUnavailable,
} from './variant-select';

const v = (id: string, colour: string, storage: string, over: { isDefault?: boolean } = {}) => ({
  id,
  isDefault: false,
  ...over,
  options: [
    { key: 'colour', value: colour, hex: colour === 'Black' ? '#111111' : '#FFFFFF' },
    { key: 'storage', value: storage },
  ],
});
const variants = [
  v('b64', 'Black', '64 GB', { isDefault: true }),
  v('b128', 'Black', '128 GB'),
  v('w64', 'White', '64 GB'),
  // no White / 128 GB combination
];

describe('axisValues', () => {
  it('lists distinct values in order of first appearance, with swatch colours', () => {
    expect(axisValues(variants, 'colour')).toEqual([
      { value: 'Black', hex: '#111111' },
      { value: 'White', hex: '#FFFFFF' },
    ]);
    expect(axisValues(variants, 'storage').map((x) => x.value)).toEqual(['64 GB', '128 GB']);
    expect(axisValues(variants, 'nope')).toEqual([]);
  });
});

describe('pickVariant', () => {
  const byId = (id: string) => {
    const found = variants.find((x) => x.id === id);
    if (!found) throw new Error(`no variant ${id}`);
    return found;
  };

  it('keeps the other choices when that combination exists', () => {
    expect(pickVariant(variants, byId('b64'), 'colour', 'White')?.id).toBe('w64');
    expect(pickVariant(variants, byId('b128'), 'colour', 'Black')?.id).toBe('b128');
    expect(pickVariant(variants, byId('w64'), 'storage', '128 GB')?.id).toBe('b128'); // closest available
  });

  it('falls back to the nearest combination when the exact one does not exist', () => {
    // White / 128 GB does not exist: choosing White while on 128 GB lands on White / 64 GB
    expect(pickVariant(variants, byId('b128'), 'colour', 'White')?.id).toBe('w64');
  });

  it('returns undefined for a value no variant has', () => {
    expect(pickVariant(variants, byId('b64'), 'colour', 'Pink')).toBeUndefined();
  });

  it('works with a single option and with no other options', () => {
    const sizes = [
      { id: 's', options: [{ key: 'size', value: 'S' }] },
      { id: 'm', options: [{ key: 'size', value: 'M' }] },
    ];
    const first = sizes[0];
    if (!first) throw new Error('fixture');
    expect(pickVariant(sizes, first, 'size', 'M')?.id).toBe('m');
  });
});

describe('valueUnavailable / initialVariant', () => {
  const out = new Set(['b64', 'b128']);
  const isOut = (x: { id: string }) => out.has(x.id);

  it('marks a value unavailable only when every variant with it is out', () => {
    expect(valueUnavailable(variants, 'colour', 'Black', isOut)).toBe(true);
    expect(valueUnavailable(variants, 'colour', 'White', isOut)).toBe(false);
    expect(valueUnavailable(variants, 'storage', '64 GB', isOut)).toBe(false); // w64 still in stock
  });

  it('opens on the default variant, or the first in stock when the default is sold out', () => {
    expect(initialVariant(variants, () => false)?.id).toBe('b64');
    expect(initialVariant(variants, isOut)?.id).toBe('w64');
    expect(initialVariant(variants, () => true)?.id).toBe('b64'); // everything sold out: keep the default
  });

  it('reads option values', () => {
    expect(optionValue({ options: [{ key: 'colour', value: 'White' }] }, 'colour')).toBe('White');
    expect(optionValue({ options: [] }, 'colour')).toBeUndefined();
  });
});
