/** Catalog shapes returned by the catalog API (docs/MASTER_PLAN.md §4). Money in cents, weight in grams. */

/* Categories nest to any depth (owner decision, 2026-10-05: no limit); cycles are refused instead. */
/** A product combines at most this many variant options (e.g. Colour × Size × Storage). */
export const MAX_VARIANT_OPTIONS = 3;

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description?: string;
  /** Optional picture for the home page tile (`site/<id>.<ext>` in the media bucket). */
  imagePath?: string;
  sortOrder: number;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  countryOfOrigin?: string;
}

// ── Category-defined attributes and variant options ───────────────────────────

export type AttributeType = 'text' | 'number' | 'choice' | 'multichoice' | 'boolean';

export interface AttributeChoice {
  /** Stable key stored on products (a slug of the label when created). */
  value: string;
  label: string;
}

/**
 * A product attribute a category asks for (e.g. "Skin type", "RAM (GB)", "Waterproof"). Defined on
 * a category and inherited by every category below it. `key` and `type` are fixed after creation.
 */
export interface AttributeDef {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  type: AttributeType;
  /** number only, e.g. "GB", "cm". */
  unit?: string;
  /** choice / multichoice only. */
  choices?: AttributeChoice[];
  /** text only: multi-line, shown as its own section on the product page (e.g. Ingredients). */
  long?: boolean;
  /** Shown as a filter on listings (choice, multichoice, boolean and number only). */
  filterable: boolean;
  /** Must be filled in before a product can be published. */
  required: boolean;
  sortOrder: number;
}

export type OptionKind = 'color' | 'text';

/** A variant option a category offers (e.g. Colour, Size, Storage). */
export interface OptionDef {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  /** `color` values carry a swatch colour; `text` values are plain words ("128 GB", "XL"). */
  kind: OptionKind;
  /** Values offered as hints in the product form. */
  suggestions?: string[];
  sortOrder: number;
}

export type AttributeValue = string | number | boolean | string[];

export interface VariantOption {
  key: string;
  value: string;
  /** Swatch colour (#RRGGBB) for `color` options. */
  hex?: string;
}

export interface Variant {
  id: string;
  sku: string;
  /** One entry per option the product uses (Product.optionKeys), in that order. */
  options: VariantOption[];
  priceCents: number;
  compareAtCents?: number;
  weightG: number;
  /** Packed size in whole cm (all three or none); delivery uses the higher of actual and volumetric weight. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  isDefault: boolean;
  sortOrder: number;
}

export type ImageStatus = 'PENDING' | 'READY' | 'FAILED';

export interface ProductImage {
  id: string;
  /** Base path of the resized renditions: `<base>/<width>.webp` (see IMAGE_WIDTHS). */
  base: string;
  alt: string;
  variantId: string | null;
  sortOrder: number;
  status: ImageStatus;
  width?: number;
  height?: number;
  error?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** Optional: many general products have no brand. */
  brandId?: string;
  categoryIds: string[];
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  description: string;
  /** Short bullet points ("Key features"). */
  highlights: string[];
  countryOfOrigin?: string;
  /** Values for the attributes of the product's categories, by attribute key. */
  attributes: Record<string, AttributeValue>;
  /** The variant options this product combines, in display order (at most MAX_VARIANT_OPTIONS). */
  optionKeys: string[];
  minPriceCents: number;
  maxPriceCents: number;
  /** Mirrored from reviews.RatingChanged events (approved reviews only). */
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ProductDetail extends Product {
  variants: Variant[];
  images: ProductImage[];
}

/** An attribute value ready to display (label resolved from the category's definition). */
export interface ProductSpec {
  key: string;
  label: string;
  /** Text, or a formatted list/number/Yes-No. */
  value: string;
  /** Long text is shown as its own section instead of a table row. */
  long: boolean;
}

/** A product's option axis with its display name, for the product page. */
export interface ProductOptionAxis {
  key: string;
  label: string;
  kind: OptionKind;
}

/** Public product page payload. */
export interface StorefrontProduct extends ProductDetail {
  brandName?: string;
  specs: ProductSpec[];
  optionAxes: ProductOptionAxis[];
}

/** Compact card data for listings. */
export interface ProductSummary {
  /** Every variant is out of stock (shown with a badge, sorted last). */
  soldOut: boolean;
  id: string;
  name: string;
  slug: string;
  brandId?: string;
  brandName?: string;
  categoryIds: string[];
  minPriceCents: number;
  maxPriceCents: number;
  /** Highest compare-at among variants priced at minPriceCents (drives "Sale" badges). */
  compareAtCents?: number;
  cover?: { base: string; alt: string };
  /** First few colour swatches for the card. */
  swatches: { name: string; hex: string }[];
  variantCount: number;
  rating?: { average: number; count: number };
  createdAt: string;
}

export interface AttributeFacet {
  key: string;
  label: string;
  type: Exclude<AttributeType, 'text'>;
  unit?: string;
  /** choice / multichoice / boolean: the values present, with counts. */
  values?: { value: string; label: string; count: number }[];
  /** number: the range present. */
  min?: number;
  max?: number;
}

export interface ProductPage {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** Facets for the current category (before brand/attribute/price filters). */
  facets: {
    brands: { slug: string; name: string; count: number }[];
    attributes: AttributeFacet[];
  };
}

/** Current, trusted data for one variant (used by the cart and by checkout; never from the browser). */
export interface VariantSnapshot {
  productId: string;
  variantId: string;
  /** False when the product is not on sale any more (draft, archived, deleted) or the variant is gone. */
  available: boolean;
  productName?: string;
  slug?: string;
  sku?: string;
  /** "Ruby · 30 ml"; empty without options. */
  label?: string;
  priceCents?: number;
  compareAtCents?: number;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  imageBase?: string;
  imageAlt?: string;
}
