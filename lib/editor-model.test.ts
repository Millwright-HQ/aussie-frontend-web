import type {
  AttributeDef,
  Category,
  CategoryNode,
  OptionDef,
  Variant,
} from '@aussie/shared-types';
import { productInputSchema } from '@aussie/validation';
import { describe, expect, it } from 'vitest';
import {
  buildInput,
  definitionsFor,
  type EditorState,
  extraIssues,
  fieldsFromValues,
  flattenTree,
  newRow,
  rowFromVariant,
  toCents,
  valuesFromFields,
} from './editor-model';

const ULID = '01M3YEF9JM6SB09BZ34JP2A1XW';
const cat = (id: string, parentId: string | null = null): Category => ({
  id,
  name: id,
  slug: id,
  parentId,
  sortOrder: 0,
});
const categories = [cat('elec'), cat('phones', 'elec')];
const attr = (categoryId: string, key: string, over: Partial<AttributeDef>): AttributeDef => ({
  id: key,
  categoryId,
  key,
  label: key,
  type: 'text',
  filterable: false,
  required: false,
  sortOrder: 0,
  ...over,
});
const attributeDefs: AttributeDef[] = [
  attr('elec', 'warranty', { label: 'Warranty' }),
  attr('elec', 'wireless', { label: 'Wireless', type: 'boolean' }),
  attr('phones', 'ram', { label: 'RAM', type: 'number', unit: 'GB', required: true }),
  attr('phones', 'skin', {
    label: 'Skin',
    type: 'multichoice',
    choices: [{ value: 'dry', label: 'Dry' }],
  }),
  attr('phones', 'notes', { label: 'Notes', type: 'text', long: true }),
];
const optionDefs: OptionDef[] = [
  { id: 'o1', categoryId: 'elec', key: 'colour', label: 'Colour', kind: 'color', sortOrder: 0 },
  { id: 'o2', categoryId: 'phones', key: 'storage', label: 'Storage', kind: 'text', sortOrder: 1 },
];
const defs = definitionsFor(categories, attributeDefs, optionDefs, ['phones']);

const state = (over: Partial<EditorState> = {}): EditorState => ({
  name: 'Phone X',
  slug: '',
  brandId: '',
  status: 'DRAFT',
  description: 'A good phone, truly.',
  highlights: 'Fast\n\n  Light  \n',
  countryOfOrigin: '',
  categoryIds: ['phones'],
  attributes: {
    ram: '8',
    wireless: 'yes',
    warranty: '  1 year ',
    notes: ' Box has charger.\nSecond line ',
    skin: [],
    bogus: 'x',
  },
  optionKeys: ['colour', 'storage', 'removed_option'],
  variants: [
    {
      ...newRow(true),
      sku: 'PHX-1',
      price: '90,000.50',
      weightG: '200',
      opts: {
        colour: { value: ' Black ', hex: '#111111' },
        storage: { value: '64 GB', hex: '#abcdef' },
      },
    },
  ],
  ...over,
});

describe('conversions', () => {
  it('turns rupees into cents', () => {
    expect(toCents('2,450.50')).toBe(245050);
    expect(toCents('')).toBeUndefined();
    expect(toCents('abc')).toBeNaN();
  });

  it('round-trips stored attribute values through the form', () => {
    const fields = fieldsFromValues({ ram: 8, wireless: false, warranty: '1 year', skin: ['dry'] });
    expect(fields).toEqual({ ram: '8', wireless: 'no', warranty: '1 year', skin: ['dry'] });
    expect(valuesFromFields(defs.attributes, fields)).toEqual({
      ram: 8,
      wireless: false,
      warranty: '1 year',
      skin: ['dry'],
    });
  });

  it('skips empty values and trims, but keeps the layout of long text', () => {
    const values = valuesFromFields(defs.attributes, {
      ram: ' ',
      wireless: '',
      warranty: ' x ',
      skin: [],
      notes: ' a\nb ',
    });
    expect(values).toEqual({ warranty: 'x', notes: ' a\nb ' });
  });

  it('leaves invalid numbers as NaN for the friendly validator', () => {
    expect(valuesFromFields(defs.attributes, { ram: 'eight' }).ram).toBeNaN();
  });

  it('builds variant rows from stored variants', () => {
    const v: Variant = {
      id: 'v1',
      sku: 'S1',
      options: [
        { key: 'colour', value: 'Black', hex: '#111111' },
        { key: 'storage', value: '64 GB' },
      ],
      priceCents: 245050,
      weightG: 200,
      lengthCm: 10,
      isDefault: true,
      sortOrder: 0,
    };
    expect(rowFromVariant(v)).toMatchObject({
      id: 'v1',
      price: '2450.50',
      weightG: '200',
      lengthCm: '10',
      widthCm: '',
      opts: { colour: { value: 'Black', hex: '#111111' }, storage: { value: '64 GB', hex: '' } },
    });
  });
});

describe('definitionsFor', () => {
  it('collects what applies to the ticked categories, parents included', () => {
    expect(defs.attributes.map((d) => d.key)).toEqual(
      ['warranty', 'wireless', 'notes', 'ram', 'skin'].sort((a, b) => {
        // inherited first, then the category's own by order then key
        const order = ['warranty', 'wireless', 'notes', 'ram', 'skin'];
        return order.indexOf(a) - order.indexOf(b);
      }),
    );
    expect(defs.options.map((o) => o.key)).toEqual(['colour', 'storage']);
    expect(
      definitionsFor(categories, attributeDefs, optionDefs, ['elec']).attributes.map((d) => d.key),
    ).toEqual(['warranty', 'wireless']);
    expect(definitionsFor(categories, attributeDefs, optionDefs, []).options).toEqual([]);
  });
});

describe('buildInput', () => {
  const input = buildInput(state(), defs);

  it('drops options and attributes that do not apply to the categories', () => {
    expect(input.optionKeys).toEqual(['colour', 'storage']);
    expect(input.attributes).not.toHaveProperty('bogus');
  });

  it('only sends a swatch colour for colour options', () => {
    expect(input.variants[0]?.options).toEqual([
      { key: 'colour', value: 'Black', hex: '#111111' },
      { key: 'storage', value: '64 GB', hex: '' },
    ]);
  });

  it('turns text into highlights and prices into cents', () => {
    expect(input.highlights).toEqual(['Fast', 'Light']);
    expect(input.variants[0]?.priceCents).toBe(9_000_050);
  });

  it('passes the shared schema once complete (no brand needed)', () => {
    const parsed = productInputSchema.safeParse({ ...input, categoryIds: [ULID] });
    expect(parsed.error?.issues).toBeUndefined();
    expect(parsed.success).toBe(true);
  });
});

describe('extraIssues', () => {
  it('asks for required attributes only when publishing', () => {
    const noRam = buildInput(state({ attributes: {} }), defs);
    expect(extraIssues(noRam, defs)).toEqual([]);
    const publish = buildInput(state({ attributes: {}, status: 'ACTIVE' }), defs);
    expect(extraIssues(publish, defs).map((i) => i.path)).toEqual(['attributes.ram']);
  });

  it('explains bad numbers and missing option values or colours per variant', () => {
    const bad = buildInput(
      state({
        attributes: { ram: 'eight' },
        variants: [
          {
            ...newRow(true),
            sku: 'A-1',
            price: '1',
            weightG: '1',
            opts: { colour: { value: 'Black', hex: '' }, storage: { value: '', hex: '' } },
          },
        ],
      }),
      defs,
    );
    const issues = extraIssues(bad, defs);
    expect(issues.map((i) => [i.path, i.message])).toEqual([
      ['attributes.ram', 'RAM must be a number'],
      ['variants.0.opt.colour', 'Pick a colour for Black'],
      ['variants.0.opt.storage', 'Enter the storage'],
    ]);
  });
});

describe('flattenTree', () => {
  it('lists every level in display order with its depth', () => {
    const node = (id: string, children: CategoryNode[] = []): CategoryNode => ({
      ...cat(id),
      children,
    });
    const flat = flattenTree([node('a', [node('b', [node('c')])]), node('d')]);
    expect(flat.map((f) => [f.node.id, f.depth])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 1],
    ]);
  });
});
