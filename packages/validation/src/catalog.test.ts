import { describe, expect, it } from 'vitest';
import {
  attributeDefCreateSchema,
  categoryInputSchema,
  discountedCents,
  optionDefCreateSchema,
  parseAttributeFilter,
  productInputSchema,
  productListQuerySchema,
  siteDiscountSchema,
  slugify,
} from './index.js';

const ULID = '01M3YEF9JM6SB09BZ34JP2A1XW';
const ruby = {
  sku: 'lp-ruby',
  options: [{ key: 'shade', value: 'Ruby', hex: '#b5121b' }],
  priceCents: 245000,
  weightG: 45,
  isDefault: true,
};
const base = {
  name: 'Velvet Matte Lipstick',
  brandId: ULID,
  categoryIds: [ULID],
  description: 'A long-wearing matte lipstick.',
  optionKeys: ['shade'],
  variants: [ruby],
};
const second = (over: Record<string, unknown> = {}) => ({
  ...ruby,
  sku: 'LP-2',
  isDefault: false,
  options: [{ key: 'shade', value: 'Nude', hex: '#c8a07e' }],
  ...over,
});

describe('slugify', () => {
  it('handles accents, ampersands and punctuation', () => {
    expect(slugify('Lumière Paris')).toBe('lumiere-paris');
    expect(slugify('Body & Bath')).toBe('body-and-bath');
    expect(slugify('  Hydra Boost Gel-Cream 50ml! ')).toBe('hydra-boost-gel-cream-50ml');
  });
});

describe('variant dimensions', () => {
  const withDims = (dims: Record<string, unknown>) => ({
    ...base,
    variants: [{ ...ruby, ...dims }],
  });

  it('are optional, and accept all three together', () => {
    expect(productInputSchema.safeParse(base).success).toBe(true);
    const ok = productInputSchema.parse(withDims({ lengthCm: 30, widthCm: 20, heightCm: 10 }));
    expect(ok.variants[0]).toMatchObject({ lengthCm: 30, widthCm: 20, heightCm: 10 });
  });

  it('treat empty strings as not provided', () => {
    const p = productInputSchema.parse(withDims({ lengthCm: '', widthCm: '', heightCm: '' }));
    expect(p.variants[0]?.lengthCm).toBeUndefined();
  });

  it('must be given all together or not at all', () => {
    expect(productInputSchema.safeParse(withDims({ lengthCm: 30 })).success).toBe(false);
    expect(productInputSchema.safeParse(withDims({ lengthCm: 30, widthCm: 20 })).success).toBe(
      false,
    );
  });

  it('are whole centimetres between 1 and 300', () => {
    for (const bad of [0, -5, 2.5, 301]) {
      expect(
        productInputSchema.safeParse(withDims({ lengthCm: bad, widthCm: 20, heightCm: 10 }))
          .success,
      ).toBe(false);
    }
  });
});

describe('variant cost', () => {
  const withCost = (costCents: unknown) => ({ ...base, variants: [{ ...ruby, costCents }] });

  it('is optional, and empty means unknown', () => {
    expect(productInputSchema.parse(base).variants[0]?.costCents).toBeUndefined();
    expect(productInputSchema.parse(withCost('')).variants[0]?.costCents).toBeUndefined();
  });

  it('accepts whole cents including 0 and rejects negatives and fractions', () => {
    expect(productInputSchema.parse(withCost(0)).variants[0]?.costCents).toBe(0);
    expect(productInputSchema.parse(withCost(120000)).variants[0]?.costCents).toBe(120000);
    for (const bad of [-1, 1.5, 200_000_001]) {
      expect(productInputSchema.safeParse(withCost(bad)).success).toBe(false);
    }
  });
});

describe('site discount', () => {
  it('is a whole percentage from 0 to 90', () => {
    for (const ok of [0, 10, 90])
      expect(siteDiscountSchema.safeParse({ percent: ok }).success).toBe(true);
    for (const bad of [-1, 91, 12.5, '10']) {
      expect(siteDiscountSchema.safeParse({ percent: bad }).success).toBe(false);
    }
    expect(siteDiscountSchema.safeParse({ percent: 10, extra: 1 }).success).toBe(false);
  });

  it('takes the percentage off a price, rounded to the cent', () => {
    expect(discountedCents(245000, 0)).toBe(245000);
    expect(discountedCents(245000, 20)).toBe(196000);
    expect(discountedCents(9999, 15)).toBe(8499); // 8499.15
    expect(discountedCents(101, 50)).toBe(51); // 50.5 rounds up
  });
});

describe('productInputSchema', () => {
  it('normalises SKU and swatch colour to upper case and defaults to Draft', () => {
    const p = productInputSchema.parse(base);
    expect(p.variants[0]).toMatchObject({
      sku: 'LP-RUBY',
      options: [{ key: 'shade', value: 'Ruby', hex: '#B5121B' }],
    });
    expect(p.status).toBe('DRAFT');
    expect(p.attributes).toEqual({});
  });

  it('works without a brand, options or attributes (any kind of product)', () => {
    const p = productInputSchema.parse({
      name: 'Steel water bottle',
      categoryIds: [ULID],
      description: 'Keeps drinks cold for 24 hours.',
      variants: [{ sku: 'BTL-001', priceCents: 150000, weightG: 400, isDefault: true }],
    });
    expect(p.brandId).toBeUndefined();
    expect(p.optionKeys).toEqual([]);
    expect(productInputSchema.safeParse({ ...p, brandId: '' }).success).toBe(true);
  });

  it('requires exactly one default variant', () => {
    expect(
      productInputSchema.safeParse({ ...base, variants: [ruby, second({ isDefault: true })] })
        .success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ ...base, variants: [{ ...ruby, isDefault: false }] }).success,
    ).toBe(false);
  });

  it('rejects repeated SKUs and repeated option combinations', () => {
    expect(
      productInputSchema.safeParse({ ...base, variants: [ruby, second({ sku: 'lp-ruby' })] })
        .success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({
        ...base,
        variants: [ruby, second({ options: [{ key: 'shade', value: 'RUBY', hex: '#111111' }] })],
      }).success,
    ).toBe(false);
  });

  it('needs options when there are several variants, and a value for each option', () => {
    const noKeys = {
      ...base,
      optionKeys: [],
      variants: [{ ...ruby, options: [] }, second({ options: [] })],
    };
    expect(productInputSchema.safeParse(noKeys).success).toBe(false);
    const missing = { ...base, variants: [ruby, second({ options: [] })] };
    expect(productInputSchema.safeParse(missing).success).toBe(false);
    const stray = {
      ...base,
      variants: [{ ...ruby, options: [...ruby.options, { key: 'size', value: 'M' }] }],
    };
    expect(productInputSchema.safeParse(stray).success).toBe(false);
  });

  it('combines up to three options, each once', () => {
    const three = {
      ...base,
      optionKeys: ['colour', 'size', 'storage'],
      variants: [
        {
          ...ruby,
          options: [
            { key: 'colour', value: 'Red' },
            { key: 'size', value: 'M' },
            { key: 'storage', value: '64 GB' },
          ],
        },
      ],
    };
    expect(productInputSchema.safeParse(three).success).toBe(true);
    expect(
      productInputSchema.safeParse({ ...three, optionKeys: ['a1', 'b1', 'c1', 'd1'] }).success,
    ).toBe(false);
    expect(productInputSchema.safeParse({ ...base, optionKeys: ['shade', 'shade'] }).success).toBe(
      false,
    );
  });

  it('accepts attribute values of every type but only under valid keys', () => {
    const ok = {
      ...base,
      attributes: { skin_type: ['dry', 'oily'], ram: 8, waterproof: true, notes: 'x' },
    };
    expect(productInputSchema.safeParse(ok).success).toBe(true);
    expect(productInputSchema.safeParse({ ...base, attributes: { 'Bad Key': 'x' } }).success).toBe(
      false,
    );
    expect(
      productInputSchema.safeParse({ ...base, attributes: { ram: { nested: 1 } } }).success,
    ).toBe(false);
  });

  it('allows prices of general merchandise but still catches typos', () => {
    expect(
      productInputSchema.safeParse({ ...base, variants: [{ ...ruby, priceCents: 150_000_000 }] })
        .success,
    ).toBe(true);
    expect(
      productInputSchema.safeParse({ ...base, variants: [{ ...ruby, priceCents: 900_000_000 }] })
        .success,
    ).toBe(false);
  });

  it('requires the sale price to be below the regular price', () => {
    const r = productInputSchema.safeParse({
      ...base,
      variants: [{ ...ruby, compareAtCents: 200000 }],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['variants', 0, 'compareAtCents']);
  });

  it('gives plain-language messages for missing price and weight', () => {
    const r = productInputSchema.safeParse({
      ...base,
      variants: [{ ...ruby, priceCents: Number.NaN, weightG: Number.NaN }],
    });
    const messages = r.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain('Enter a price');
    expect(messages).toContain('Enter the packed weight in grams');
  });

  it('rejects unknown fields (mass assignment) and the removed cosmetics fields', () => {
    expect(productInputSchema.safeParse({ ...base, minPriceCents: 1 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, tagIds: [] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, ingredients: 'x' }).success).toBe(false);
    expect(
      productInputSchema.safeParse({ ...base, variants: [{ ...ruby, shadeName: 'Ruby' }] }).success,
    ).toBe(false);
  });
});

describe('attribute definitions', () => {
  const choice = { type: 'choice', label: 'Material', choices: ['Cotton', 'Linen'] };

  it('accepts each type with its own settings', () => {
    expect(attributeDefCreateSchema.safeParse({ type: 'text', label: 'Warranty' }).success).toBe(
      true,
    );
    expect(
      attributeDefCreateSchema.safeParse({ type: 'text', label: 'Ingredients', long: true })
        .success,
    ).toBe(true);
    expect(
      attributeDefCreateSchema.safeParse({
        type: 'number',
        label: 'RAM',
        unit: 'GB',
        filterable: true,
      }).success,
    ).toBe(true);
    expect(attributeDefCreateSchema.safeParse({ ...choice, filterable: true }).success).toBe(true);
    expect(
      attributeDefCreateSchema.safeParse({ type: 'boolean', label: 'Waterproof', filterable: true })
        .success,
    ).toBe(true);
  });

  it('rejects settings that do not fit the type', () => {
    const bad = (o: object) => attributeDefCreateSchema.safeParse(o).success;
    expect(bad({ type: 'choice', label: 'Material' })).toBe(false); // no choices
    expect(bad({ type: 'text', label: 'Warranty', choices: ['x'] })).toBe(false);
    expect(bad({ type: 'text', label: 'Warranty', unit: 'GB' })).toBe(false);
    expect(bad({ type: 'number', label: 'RAM', long: true })).toBe(false);
    expect(bad({ type: 'text', label: 'Warranty', filterable: true })).toBe(false);
    expect(bad({ ...choice, choices: ['Dry skin', 'dry skin'] })).toBe(false);
    expect(bad({ ...choice, key: 'Bad Key' })).toBe(false);
  });
});

describe('option definitions', () => {
  it('are colour or text options', () => {
    expect(optionDefCreateSchema.safeParse({ kind: 'color', label: 'Colour' }).success).toBe(true);
    expect(
      optionDefCreateSchema.safeParse({ kind: 'text', label: 'Size', suggestions: ['S', 'M'] })
        .success,
    ).toBe(true);
    expect(optionDefCreateSchema.safeParse({ kind: 'number', label: 'Size' }).success).toBe(false);
  });
});

describe('categoryInputSchema', () => {
  it('treats an empty parent as top-level', () => {
    expect(categoryInputSchema.parse({ name: 'Skincare', parentId: '' }).parentId).toBeNull();
  });
});

describe('productListQuerySchema', () => {
  it('splits comma lists and caps page size', () => {
    const r = productListQuerySchema.parse({ brand: 'a,b', attr: 'skin_type:dry|oily' });
    expect(r).toMatchObject({
      brand: ['a', 'b'],
      attr: ['skin_type:dry|oily'],
      sort: 'newest',
      page: 1,
      pageSize: 24,
    });
    expect(productListQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ brand: '../etc' }).success).toBe(false);
  });

  it('takes repeated attribute filters and rejects malformed or too many', () => {
    expect(productListQuerySchema.parse({ attr: ['a1:x', 'b1:1..5'] }).attr).toHaveLength(2);
    expect(productListQuerySchema.safeParse({ attr: 'nocolon' }).success).toBe(false);
    expect(
      productListQuerySchema.safeParse({ attr: Array.from({ length: 13 }, (_, i) => `k${i}x:v`) })
        .success,
    ).toBe(false);
    expect(productListQuerySchema.safeParse({ tag: 'dry' }).success).toBe(false);
  });
});

describe('parseAttributeFilter', () => {
  it('parses value lists, booleans and ranges', () => {
    expect(parseAttributeFilter('skin_type:dry|oily')).toEqual({
      key: 'skin_type',
      kind: 'values',
      values: ['dry', 'oily'],
    });
    expect(parseAttributeFilter('waterproof:true')).toEqual({
      key: 'waterproof',
      kind: 'values',
      values: ['true'],
    });
    expect(parseAttributeFilter('ram:8..16')).toEqual({
      key: 'ram',
      kind: 'range',
      min: 8,
      max: 16,
    });
    expect(parseAttributeFilter('ram:8..')).toEqual({
      key: 'ram',
      kind: 'range',
      min: 8,
      max: undefined,
    });
    expect(parseAttributeFilter('ram:..16')).toEqual({
      key: 'ram',
      kind: 'range',
      min: undefined,
      max: 16,
    });
  });
  it('skips malformed filters', () => {
    expect(parseAttributeFilter('ram:..')).toBeUndefined();
    expect(parseAttributeFilter('ram:a..b')).toBeUndefined();
    expect(parseAttributeFilter('ram:')).toBeUndefined();
    expect(parseAttributeFilter(':x')).toBeUndefined();
  });
});
