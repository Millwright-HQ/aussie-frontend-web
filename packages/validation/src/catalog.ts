import { MAX_VARIANT_OPTIONS } from '@aussie/shared-types';
import { z } from 'zod';
import { SITE_IMAGE_PATH } from './content.js';
import { optionalText, slugSchema, ulidSchema } from './schemas.js';

/** "Hydra Boost Gel-Cream 50ml!" → "hydra-boost-gel-cream-50ml". */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

const optionalSlug = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  slugSchema.optional(),
);

/** Attribute and option keys: stored on products, so lower-case and stable. */
export const keySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,39}$/, 'Use 2-40 lower-case letters, numbers or underscores');

/** "Skin type" → "skin_type". */
export const keyFromLabel = (label: string) => slugify(label).replace(/-/g, '_').slice(0, 40);

// ── Taxonomy ──────────────────────────────────────────────────────────────────

export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: optionalSlug,
    /** null/absent = top-level. Categories nest to any depth. */
    parentId: z.preprocess((v) => (v === '' ? null : v), ulidSchema.nullable().optional()),
    description: optionalText(500),
    imagePath: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().regex(SITE_IMAGE_PATH, 'Upload the picture again').optional(),
    ),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const brandInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    slug: optionalSlug,
    description: optionalText(500),
    countryOfOrigin: optionalText(60),
  })
  .strict();
export type BrandInput = z.infer<typeof brandInputSchema>;

// ── Category-defined attributes and variant options ───────────────────────────

export const ATTRIBUTE_TYPES = ['text', 'number', 'choice', 'multichoice', 'boolean'] as const;
export const OPTION_KINDS = ['color', 'text'] as const;

/** Stable key for a choice, from its label ("Dry skin" → "dry_skin"). */
export const choiceValue = keyFromLabel;

const attributeFields = {
  label: z.string().trim().min(2, 'Enter a name').max(40),
  unit: optionalText(12),
  /** Choice labels; their stored values are derived from the labels. */
  choices: z.array(z.string().trim().min(1).max(40)).max(60).default([]),
  long: z.boolean().default(false),
  filterable: z.boolean().default(false),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
};

/** Rules that depend on the attribute's type (also checked by the service on updates). */
export function attributeTypeIssues(a: {
  type: (typeof ATTRIBUTE_TYPES)[number];
  unit?: string;
  choices: string[];
  long: boolean;
  filterable: boolean;
}): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const isChoice = a.type === 'choice' || a.type === 'multichoice';
  if (isChoice && a.choices.length < 1)
    issues.push({ path: 'choices', message: 'Add at least one choice' });
  if (!isChoice && a.choices.length > 0)
    issues.push({ path: 'choices', message: 'Only choice attributes have choices' });
  if (isChoice && new Set(a.choices.map(choiceValue)).size !== a.choices.length) {
    issues.push({ path: 'choices', message: 'Two choices look the same' });
  }
  if (a.unit && a.type !== 'number')
    issues.push({ path: 'unit', message: 'Only number attributes have a unit' });
  if (a.long && a.type !== 'text')
    issues.push({ path: 'long', message: 'Only text attributes can be long' });
  if (a.filterable && a.type === 'text') {
    issues.push({
      path: 'filterable',
      message: 'Text attributes cannot be filters; use a choice list instead',
    });
  }
  return issues;
}

export const attributeDefCreateSchema = z
  .object({ key: keySchema.optional(), type: z.enum(ATTRIBUTE_TYPES), ...attributeFields })
  .strict()
  .superRefine((a, ctx) => {
    for (const i of attributeTypeIssues(a))
      ctx.addIssue({ code: 'custom', path: [i.path], message: i.message });
  });
export type AttributeDefCreate = z.infer<typeof attributeDefCreateSchema>;

/** Updates keep the key and type; the service checks type-dependent rules against the stored type. */
export const attributeDefUpdateSchema = z.object(attributeFields).strict();
export type AttributeDefUpdate = z.infer<typeof attributeDefUpdateSchema>;

const optionFields = {
  label: z.string().trim().min(2, 'Enter a name').max(40),
  suggestions: z.array(z.string().trim().min(1).max(40)).max(60).default([]),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
};

export const optionDefCreateSchema = z
  .object({ key: keySchema.optional(), kind: z.enum(OPTION_KINDS), ...optionFields })
  .strict();
export type OptionDefCreate = z.infer<typeof optionDefCreateSchema>;

export const optionDefUpdateSchema = z.object(optionFields).strict();
export type OptionDefUpdate = z.infer<typeof optionDefUpdateSchema>;

// ── Products ──────────────────────────────────────────────────────────────────

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const MAX_VARIANTS = 40;
/** Rs 2,000,000 per unit covers general merchandise (laptops, furniture); still guards typos like extra zeros. */
const priceSchema = z
  .number({ message: 'Enter a price' })
  .int('Use at most 2 decimal places')
  .min(100, 'Price must be at least Rs 1')
  .max(200_000_000, 'Price looks too high');

/** Packed size in whole centimetres; empty = not provided. */
const dimensionSchema = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z
    .number({ message: 'Enter whole centimetres' })
    .int('Use whole centimetres')
    .min(1, 'At least 1 cm')
    .max(300, 'Looks too large (max 300 cm)')
    .optional(),
);

const hexSchema = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Colour must look like #C8A165')
    .transform((s) => s.toUpperCase())
    .optional(),
);

export const variantOptionSchema = z
  .object({
    key: keySchema,
    value: z.string().trim().min(1, 'Enter a value').max(40),
    hex: hexSchema,
  })
  .strict();

export const variantInputSchema = z
  .object({
    id: ulidSchema.optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, 'SKU: 3-40 letters, numbers or hyphens'),
    options: z.array(variantOptionSchema).max(MAX_VARIANT_OPTIONS).default([]),
    priceCents: priceSchema,
    compareAtCents: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      priceSchema.optional(),
    ),
    /** Purchase cost per unit; empty = unknown. Unlike the price it may be 0. */
    costCents: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z
        .number({ message: 'Enter the cost' })
        .int('Use at most 2 decimal places')
        .min(0, 'Cost cannot be negative')
        .max(200_000_000, 'Cost looks too high')
        .optional(),
    ),
    weightG: z
      .number({ message: 'Enter the packed weight in grams' })
      .int('Use whole grams')
      .min(1, 'Weight is needed for delivery fees')
      .max(30_000, 'Weight looks too high (max 30 kg)'),
    lengthCm: dimensionSchema,
    widthCm: dimensionSchema,
    heightCm: dimensionSchema,
    isDefault: z.boolean().default(false),
  })
  .strict()
  .refine(
    (v) => [v.lengthCm, v.widthCm, v.heightCm].filter((d) => d !== undefined).length % 3 === 0,
    {
      message: 'Enter length, width and height together, or leave all three empty',
      path: ['lengthCm'],
    },
  )
  .refine((v) => v.compareAtCents === undefined || v.compareAtCents > v.priceCents, {
    message: 'Sale price must be lower than the regular (compare-at) price',
    path: ['compareAtCents'],
  });
export type VariantInput = z.infer<typeof variantInputSchema>;

/** Capped so a typo cannot give the shop away. */
export const MAX_SITE_DISCOUNT_PERCENT = 90;
export const siteDiscountSchema = z
  .object({
    percent: z
      .number({ message: 'Enter a percentage' })
      .int('Use a whole percentage')
      .min(0, 'Cannot be negative')
      .max(MAX_SITE_DISCOUNT_PERCENT, `At most ${MAX_SITE_DISCOUNT_PERCENT}%`),
  })
  .strict();
export type SiteDiscountInput = z.infer<typeof siteDiscountSchema>;

/** Price after the store-wide discount, rounded to the nearest cent. */
export function discountedCents(priceCents: number, percent: number): number {
  return percent <= 0 ? priceCents : Math.round((priceCents * (100 - percent)) / 100);
}

const attributeValueSchema = z.union([
  z.string().max(5000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(60)).max(60),
]);

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the product name').max(150),
    slug: optionalSlug,
    brandId: z.preprocess((v) => (v === '' ? undefined : v), ulidSchema.optional()),
    categoryIds: z.array(ulidSchema).min(1, 'Pick at least one category').max(5),
    status: z.enum(PRODUCT_STATUSES).default('DRAFT'),
    description: z.string().trim().min(10, 'Add a short description').max(5000),
    highlights: z.array(z.string().trim().min(3).max(160)).max(8).default([]),
    countryOfOrigin: optionalText(60),
    /** Values for the attributes of the chosen categories (checked against their definitions). */
    attributes: z.record(keySchema, attributeValueSchema).default({}),
    /** The variant options this product combines; every variant gives a value for each. */
    optionKeys: z.array(keySchema).max(MAX_VARIANT_OPTIONS).default([]),
    variants: z.array(variantInputSchema).min(1).max(MAX_VARIANTS),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (new Set(p.optionKeys).size !== p.optionKeys.length) {
      issue(['optionKeys'], 'Each option can be used once');
    }
    if (p.variants.filter((v) => v.isDefault).length !== 1) {
      issue(['variants'], 'Mark exactly one variant as the default');
    }
    if (p.variants.length > 1 && p.optionKeys.length === 0) {
      issue(['optionKeys'], 'Pick the options (e.g. Colour, Size) that tell the variants apart');
    }

    const skus = new Set<string>();
    const combos = new Set<string>();
    const expected = [...p.optionKeys].sort().join('|');
    p.variants.forEach((v, i) => {
      if (skus.has(v.sku)) issue(['variants', i, 'sku'], 'SKU repeated');
      skus.add(v.sku);
      if (
        v.options
          .map((o) => o.key)
          .sort()
          .join('|') !== expected
      ) {
        issue(['variants', i, 'options'], 'Give a value for every option this product uses');
        return;
      }
      if (p.optionKeys.length > 0) {
        const byKey = new Map(v.options.map((o) => [o.key, o.value.toLowerCase()]));
        const combo = p.optionKeys.map((k) => byKey.get(k)).join('|');
        if (combos.has(combo))
          issue(['variants', i, 'options'], 'This combination of options is used twice');
        combos.add(combo);
      }
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;

// ── Media ─────────────────────────────────────────────────────────────────────

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Resized WebP widths written by the image processor; the storefront picks from these. */
export const IMAGE_WIDTHS = [320, 640, 1024, 1600] as const;

export const imageUploadRequestSchema = z
  .object({
    contentType: z.enum(IMAGE_TYPES, { message: 'Use JPEG, PNG, WebP or AVIF' }),
    size: z.number().int().min(1).max(MAX_IMAGE_BYTES, 'Images must be 10 MB or smaller'),
  })
  .strict();

export const imageUpdateSchema = z
  .object({
    alt: z.string().trim().min(3, 'Describe the image (for screen readers)').max(150),
    variantId: z.preprocess((v) => (v === '' ? null : v), ulidSchema.nullable()),
  })
  .strict();

export const imageOrderSchema = z
  .object({ imageIds: z.array(ulidSchema).min(1).max(200) })
  .strict();

// ── Storefront listing ────────────────────────────────────────────────────────

export const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc', 'name'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

const slugList = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
  z.array(slugSchema).max(20).optional(),
);
const rupees = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().int().min(0).max(1_000_000).optional(),
);

/**
 * Attribute filters, repeated: `attr=skin_type:dry|oily`, `attr=waterproof:true`,
 * `attr=ram:8..16` (either end of a number range may be left out: `ram:8..`).
 */
export const ATTRIBUTE_FILTER_PATTERN = /^[a-z][a-z0-9_]{1,39}:[^:&]{1,300}$/;
const attrFilters = z.preprocess(
  (v) => (typeof v === 'string' ? [v] : v),
  z.array(z.string().regex(ATTRIBUTE_FILTER_PATTERN)).max(12).optional(),
);

export const productListQuerySchema = z
  .object({
    category: slugSchema.optional(),
    brand: slugList,
    attr: attrFilters,
    minPrice: rupees,
    maxPrice: rupees,
    q: optionalText(60),
    sort: z.enum(PRODUCT_SORTS).default('newest'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(24),
  })
  .strict();
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/** One parsed `attr` filter. */
export type AttributeFilter =
  | { key: string; kind: 'values'; values: string[] }
  | { key: string; kind: 'range'; min?: number; max?: number };

/** Parses `key:a|b` or `key:min..max`; malformed entries are skipped. */
export function parseAttributeFilter(raw: string): AttributeFilter | undefined {
  const at = raw.indexOf(':');
  if (at < 1) return undefined;
  const key = raw.slice(0, at);
  const rest = raw.slice(at + 1);
  if (rest.includes('..')) {
    const [lo = '', hi = ''] = rest.split('..');
    const num = (s: string) =>
      s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s);
    const min = num(lo);
    const max = num(hi);
    return min === undefined && max === undefined ? undefined : { key, kind: 'range', min, max };
  }
  const values = rest.split('|').filter(Boolean);
  return values.length ? { key, kind: 'values', values } : undefined;
}
