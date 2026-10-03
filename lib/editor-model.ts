import type {
  AttributeDef,
  AttributeValue,
  Category,
  CategoryNode,
  OptionDef,
  ProductDetail,
  Variant,
} from '@aussie/shared-types';
import { effectiveDefs, validateAttributeValues } from '@aussie/validation';

/** Pure parts of the product form: state shapes, conversions and building the API request. */

/** UI state for one attribute: text/number/choice as a string, multichoice as a list, boolean as '' | 'yes' | 'no'. */
export type AttributeField = string | string[];
export type AttributeFields = Record<string, AttributeField>;

export interface OptionCell {
  value: string;
  hex: string;
}

export interface VariantRow {
  key: string;
  id?: string;
  sku: string;
  /** By option key. */
  opts: Record<string, OptionCell>;
  price: string;
  compareAt: string;
  weightG: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  isDefault: boolean;
}

let rowSeq = 0;
export const newRow = (isDefault = false): VariantRow => ({
  key: `row-${++rowSeq}`,
  sku: '',
  opts: {},
  price: '',
  compareAt: '',
  weightG: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  isDefault,
});

export const toRupees = (cents?: number) => (cents === undefined ? '' : (cents / 100).toFixed(2));
/** "2,450.50" → 245050; empty → undefined; invalid → NaN (caught by the schema). */
export const toCents = (rupees: string) => {
  const clean = rupees.replace(/,/g, '').trim();
  return clean === '' ? undefined : Math.round(Number(clean) * 100);
};

export function rowFromVariant(v: Variant): VariantRow {
  return {
    key: v.id,
    id: v.id,
    sku: v.sku,
    opts: Object.fromEntries(v.options.map((o) => [o.key, { value: o.value, hex: o.hex ?? '' }])),
    price: toRupees(v.priceCents),
    compareAt: toRupees(v.compareAtCents),
    weightG: String(v.weightG),
    lengthCm: v.lengthCm === undefined ? '' : String(v.lengthCm),
    widthCm: v.widthCm === undefined ? '' : String(v.widthCm),
    heightCm: v.heightCm === undefined ? '' : String(v.heightCm),
    isDefault: v.isDefault,
  };
}

/** Stored attribute values → form state. */
export function fieldsFromValues(values: Record<string, AttributeValue>): AttributeFields {
  return Object.fromEntries(
    Object.entries(values).map(([key, v]) => [
      key,
      Array.isArray(v) ? v : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v),
    ]),
  );
}

/** Form state → typed values for the attributes that apply (empty ones are left out). */
export function valuesFromFields(
  defs: AttributeDef[],
  fields: AttributeFields,
): Record<string, AttributeValue> {
  const entries: [string, AttributeValue][] = [];
  for (const def of defs) {
    const raw = Object.entries(fields).find(([k]) => k === def.key)?.[1];
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      if (raw.length) entries.push([def.key, raw]);
      continue;
    }
    const s = raw.trim();
    if (s === '') continue;
    if (def.type === 'number')
      entries.push([def.key, Number(s)]); // NaN is reported by validateAttributeValues
    else if (def.type === 'boolean') entries.push([def.key, s === 'yes']);
    else entries.push([def.key, def.type === 'text' && def.long ? raw : s]);
  }
  return Object.fromEntries(entries);
}

/** Everything that depends on which categories are ticked. */
export function definitionsFor(
  categories: Category[],
  attributeDefs: AttributeDef[],
  optionDefs: OptionDef[],
  categoryIds: string[],
) {
  return {
    attributes: effectiveDefs(categories, attributeDefs, categoryIds),
    options: effectiveDefs(categories, optionDefs, categoryIds),
  };
}

/** The tree as a flat list in display order, with each category's depth (1 = top level). */
export function flattenTree(
  tree: CategoryNode[],
  depth = 1,
): { node: CategoryNode; depth: number }[] {
  return tree.flatMap((node) => [{ node, depth }, ...flattenTree(node.children, depth + 1)]);
}

export interface EditorState {
  name: string;
  slug: string;
  brandId: string;
  status: ProductDetail['status'];
  description: string;
  highlights: string;
  countryOfOrigin: string;
  categoryIds: string[];
  attributes: AttributeFields;
  optionKeys: string[];
  variants: VariantRow[];
}

/** The API request for the current form, limited to what applies to the ticked categories. */
export function buildInput(
  state: EditorState,
  defs: { attributes: AttributeDef[]; options: OptionDef[] },
) {
  const applicable = new Set(defs.options.map((o) => o.key));
  const optionKeys = state.optionKeys.filter((k) => applicable.has(k));
  const kindOf = (key: string) => defs.options.find((o) => o.key === key)?.kind;
  return {
    name: state.name,
    slug: state.slug,
    brandId: state.brandId,
    categoryIds: state.categoryIds,
    status: state.status,
    description: state.description,
    highlights: state.highlights
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean),
    countryOfOrigin: state.countryOfOrigin,
    attributes: valuesFromFields(defs.attributes, state.attributes),
    optionKeys,
    variants: state.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      sku: v.sku,
      options: optionKeys.map((key) => {
        const cell = Object.entries(v.opts).find(([k]) => k === key)?.[1];
        return {
          key,
          value: cell?.value.trim() ?? '',
          hex: kindOf(key) === 'color' ? (cell?.hex ?? '') : '',
        };
      }),
      priceCents: toCents(v.price) ?? Number.NaN,
      compareAtCents: toCents(v.compareAt),
      weightG: Number(v.weightG || Number.NaN),
      lengthCm: v.lengthCm.trim() === '' ? undefined : Number(v.lengthCm),
      widthCm: v.widthCm.trim() === '' ? undefined : Number(v.widthCm),
      heightCm: v.heightCm.trim() === '' ? undefined : Number(v.heightCm),
      isDefault: v.isDefault,
    })),
  };
}

/** Friendly issues the schema can't give: values against the categories' definitions, swatch colours. */
export function extraIssues(
  input: ReturnType<typeof buildInput>,
  defs: { attributes: AttributeDef[]; options: OptionDef[] },
): { path: string; message: string }[] {
  const issues = validateAttributeValues(defs.attributes, input.attributes, {
    requireRequired: input.status === 'ACTIVE',
  });
  input.variants.forEach((v, i) => {
    for (const o of v.options) {
      const def = defs.options.find((d) => d.key === o.key);
      if (!def) continue;
      if (o.value === '')
        issues.push({
          path: `variants.${i}.opt.${o.key}`,
          message: `Enter the ${def.label.toLowerCase()}`,
        });
      else if (def.kind === 'color' && !/^#[0-9a-fA-F]{6}$/.test(o.hex)) {
        issues.push({
          path: `variants.${i}.opt.${o.key}`,
          message: `Pick a colour for ${o.value}`,
        });
      }
    }
  });
  return issues;
}
