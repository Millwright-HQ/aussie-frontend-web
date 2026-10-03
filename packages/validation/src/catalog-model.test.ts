import type { AttributeDef, Category, OptionDef } from '@aussie/shared-types';
import { describe, expect, it } from 'vitest';
import {
  ancestorChain,
  categoryDepth,
  compactAttributes,
  descendantIds,
  effectiveDefs,
  formatSpecs,
  subtreeHeight,
  validateAttributeValues,
} from './index.js';

const cat = (id: string, parentId: string | null = null): Category => ({
  id,
  name: id,
  slug: id,
  parentId,
  sortOrder: 0,
});
// beauty > makeup > lips ;  electronics > phones
const categories = [
  cat('beauty'),
  cat('makeup', 'beauty'),
  cat('lips', 'makeup'),
  cat('electronics'),
  cat('phones', 'electronics'),
];

const attr = (categoryId: string, key: string, over: Partial<AttributeDef> = {}): AttributeDef => ({
  id: `${categoryId}-${key}`,
  categoryId,
  key,
  label: key.replace('_', ' '),
  type: 'text',
  filterable: false,
  required: false,
  sortOrder: 0,
  ...over,
});

describe('category tree', () => {
  it('walks ancestors and measures depth', () => {
    expect(ancestorChain(categories, 'lips').map((c) => c.id)).toEqual([
      'lips',
      'makeup',
      'beauty',
    ]);
    expect(categoryDepth(categories, 'beauty')).toBe(1);
    expect(categoryDepth(categories, 'lips')).toBe(3);
    expect(ancestorChain(categories, 'nope')).toEqual([]);
  });

  it('survives a cycle in bad data', () => {
    const loop = [cat('a', 'b'), cat('b', 'a')];
    expect(ancestorChain(loop, 'a').length).toBeLessThanOrEqual(2);
  });

  it('collects descendants and subtree height', () => {
    expect([...descendantIds(categories, 'beauty')].sort()).toEqual(['beauty', 'lips', 'makeup']);
    expect(subtreeHeight(categories, 'beauty')).toBe(3);
    expect(subtreeHeight(categories, 'lips')).toBe(1);
  });
});

describe('effectiveDefs', () => {
  const defs = [
    attr('beauty', 'skin_type', { sortOrder: 2 }),
    attr('beauty', 'ingredients', { sortOrder: 1 }),
    attr('makeup', 'finish'),
    attr('lips', 'finish', { label: 'Lip finish' }),
    attr('electronics', 'warranty'),
  ];

  it('inherits from ancestors, general fields first then by order', () => {
    expect(effectiveDefs(categories, defs, ['makeup']).map((d) => d.key)).toEqual([
      'ingredients',
      'skin_type',
      'finish',
    ]);
  });

  it('lets the nearest definition win when a key repeats', () => {
    const finish = effectiveDefs(categories, defs, ['lips']).find((d) => d.key === 'finish');
    expect(finish?.label).toBe('Lip finish');
  });

  it('merges several categories and ignores unrelated ones', () => {
    const keys = effectiveDefs(categories, defs, ['lips', 'phones']).map((d) => d.key);
    expect(keys).toContain('warranty');
    expect(keys).toContain('skin_type');
    expect(effectiveDefs(categories, defs, ['phones']).map((d) => d.key)).toEqual(['warranty']);
  });
});

describe('validateAttributeValues', () => {
  const defs: AttributeDef[] = [
    attr('x', 'note', { type: 'text' }),
    attr('x', 'ram', { type: 'number', unit: 'GB', required: true }),
    attr('x', 'material', {
      type: 'choice',
      choices: [
        { value: 'cotton', label: 'Cotton' },
        { value: 'linen', label: 'Linen' },
      ],
    }),
    attr('x', 'skin_type', {
      type: 'multichoice',
      choices: [
        { value: 'dry', label: 'Dry' },
        { value: 'oily', label: 'Oily' },
      ],
    }),
    attr('x', 'waterproof', { type: 'boolean' }),
  ];
  const check = (values: Record<string, unknown>, requireRequired = true) =>
    validateAttributeValues(defs, values, { requireRequired }).map((i) => i.path);

  it('accepts valid values of every type', () => {
    expect(
      check({ note: 'hi', ram: 8, material: 'cotton', skin_type: ['dry'], waterproof: false }),
    ).toEqual([]);
  });

  it('rejects wrong types, unknown choices and unknown keys', () => {
    expect(check({ ram: '8' })).toEqual(['attributes.ram']);
    expect(check({ ram: Number.NaN })).toEqual(['attributes.ram']);
    expect(check({ ram: 8, material: 'silk' })).toEqual(['attributes.material']);
    expect(check({ ram: 8, skin_type: ['dry', 'dry'] })).toEqual(['attributes.skin_type']);
    expect(check({ ram: 8, skin_type: ['dusty'] })).toEqual(['attributes.skin_type']);
    expect(check({ ram: 8, waterproof: 'yes' })).toEqual(['attributes.waterproof']);
    expect(check({ ram: 8, secret: 1 })).toEqual(['attributes.secret']);
    expect(check({ ram: 8, note: 'x'.repeat(201) })).toEqual(['attributes.note']);
  });

  it('only demands required attributes when publishing', () => {
    expect(check({}, true)).toEqual(['attributes.ram']);
    expect(check({}, false)).toEqual([]);
    expect(check({ ram: '' }, true)).toEqual(['attributes.ram']);
  });

  it('does not treat inherited object properties as values', () => {
    expect(check({ ram: 8 })).toEqual([]);
    expect(validateAttributeValues(defs, { ram: 8 }, { requireRequired: true })).toEqual([]);
  });
});

describe('formatSpecs / compactAttributes', () => {
  const defs: AttributeDef[] = [
    attr('x', 'ram', { type: 'number', unit: 'GB', label: 'RAM' }),
    attr('x', 'material', {
      type: 'choice',
      label: 'Material',
      choices: [{ value: 'cotton', label: 'Cotton' }],
    }),
    attr('x', 'skin_type', {
      type: 'multichoice',
      label: 'Skin type',
      choices: [
        { value: 'dry', label: 'Dry' },
        { value: 'oily', label: 'Oily' },
      ],
    }),
    attr('x', 'waterproof', { type: 'boolean', label: 'Waterproof' }),
    attr('x', 'ingredients', { type: 'text', label: 'Ingredients', long: true }),
  ];
  it('turns values into readable rows and skips empties', () => {
    const specs = formatSpecs(defs, {
      ram: 8,
      material: 'cotton',
      skin_type: ['dry', 'oily'],
      waterproof: false,
      ingredients: 'Water',
    });
    expect(specs.map((s) => [s.label, s.value, s.long])).toEqual([
      ['RAM', '8 GB', false],
      ['Material', 'Cotton', false],
      ['Skin type', 'Dry, Oily', false],
      ['Waterproof', 'No', false],
      ['Ingredients', 'Water', true],
    ]);
    expect(formatSpecs(defs, { ram: '' as unknown as number })).toEqual([]);
  });
  it('compacts empty values', () => {
    expect(compactAttributes({ a: '', b: [], c: 0, d: false, e: 'x' })).toEqual({
      c: 0,
      d: false,
      e: 'x',
    });
  });
});

describe('option defs share the same inheritance', () => {
  it('resolves option definitions like attributes', () => {
    const options: OptionDef[] = [
      { id: '1', categoryId: 'beauty', key: 'shade', label: 'Shade', kind: 'color', sortOrder: 0 },
      {
        id: '2',
        categoryId: 'electronics',
        key: 'storage',
        label: 'Storage',
        kind: 'text',
        sortOrder: 0,
      },
    ];
    expect(effectiveDefs(categories, options, ['lips']).map((o) => o.key)).toEqual(['shade']);
  });
});
