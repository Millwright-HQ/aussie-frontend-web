import 'server-only';
import type { Brand, CategoryNode, ProductPage, StorefrontProduct } from '@aussie/shared-types';
import { parseAttributeFilter } from '@aussie/validation';
import { API_URL } from './api';

/** Every storefront catalog read carries this tag; admin edits call updateTag(CATALOG_TAG). */
export const CATALOG_TAG = 'catalog';

async function publicGet<T>(path: string): Promise<T | null> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set (run pnpm local:deploy)');
  const res = await fetch(`${API_URL}/v1/catalog${path}`, {
    // Cached and shared across visitors; refreshed every minute or immediately after admin edits.
    next: { revalidate: 60, tags: [CATALOG_TAG] },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Catalog API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return (await publicGet<{ items: CategoryNode[] }>('/categories'))?.items ?? [];
}

export async function getBrands(): Promise<Brand[]> {
  return (await publicGet<{ items: Brand[] }>('/brands'))?.items ?? [];
}

export function getProduct(slug: string) {
  return publicGet<StorefrontProduct>(`/products/${encodeURIComponent(slug)}`);
}

/** The nodes from a top-level category down to the one matching `match` (empty when none does). */
export function categoryTrail(
  tree: CategoryNode[],
  match: (c: CategoryNode) => boolean,
): CategoryNode[] {
  for (const node of tree) {
    if (match(node)) return [node];
    const below = categoryTrail(node.children, match);
    if (below.length) return [node, ...below];
  }
  return [];
}

/** The deepest of a product's categories, as a trail for the breadcrumb. */
export function deepestTrail(tree: CategoryNode[], categoryIds: string[]): CategoryNode[] {
  const trails = categoryIds
    .map((id) => categoryTrail(tree, (c) => c.id === id))
    .filter((t) => t.length > 0);
  return trails.sort((a, b) => b.length - a.length)[0] ?? [];
}

// ── Listing URLs ──────────────────────────────────────────────────────────────

/**
 * Attribute filters travel in the page URL as plain form fields, so the filter form works without
 * JavaScript: `f.skin_type=dry&f.skin_type=oily`, `fmin.ram=8&fmax.ram=16`. They are turned into
 * the API's `attr=key:a|b` / `attr=key:min..max` form below.
 */
export interface ListingParams {
  category?: string;
  brand?: string[];
  /** API form: `key:a|b` or `key:min..max`. */
  attr?: string[];
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  sort?: string;
  page?: string;
}

const KEY = /^[a-z][a-z0-9_]{1,39}$/;
const VALUE = /^[A-Za-z0-9_-]{1,60}$/;
/** A plain decimal number (digits, one sign, one point), short enough to be a sensible filter value. */
const isNumber = (s: string) =>
  s.length <= 14 && /^[-0-9.]+$/.test(s) && Number.isFinite(Number(s));

/** Normalises URL search params into the API query (unknown keys are dropped). */
export function listingParams(sp: Record<string, string | string[] | undefined>): ListingParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const many = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? v.split(',') : []).filter((x) => /^[a-z0-9-]{1,120}$/.test(x));
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

  const values = new Map<string, string[]>();
  const mins = new Map<string, string>();
  const maxs = new Map<string, string>();
  for (const [name, raw] of Object.entries(sp)) {
    const m = /^(f|fmin|fmax)\.(.+)$/.exec(name);
    const prefix = m?.[1];
    const key = m?.[2];
    if (!prefix || !key || !KEY.test(key)) continue;
    if (prefix === 'f') {
      const vs = list(raw).filter((v) => VALUE.test(v));
      if (vs.length) values.set(key, vs);
    } else {
      const n = one(raw)?.trim();
      if (n && isNumber(n)) (prefix === 'fmin' ? mins : maxs).set(key, n);
    }
  }
  const attr = [
    ...[...values].map(([k, vs]) => `${k}:${vs.join('|')}`),
    ...[...new Set([...mins.keys(), ...maxs.keys()])].map(
      (k) => `${k}:${mins.get(k) ?? ''}..${maxs.get(k) ?? ''}`,
    ),
  ];
  return {
    brand: many(sp.brand),
    attr,
    minPrice: one(sp.minPrice),
    maxPrice: one(sp.maxPrice),
    q: one(sp.q),
    sort: one(sp.sort),
    page: one(sp.page),
  };
}

/** Writes attribute filters back as page-URL fields (the inverse of listingParams). */
export function attrToSearchParams(attr: string[] | undefined, qs: URLSearchParams) {
  for (const raw of attr ?? []) {
    const f = parseAttributeFilter(raw);
    if (!f) continue;
    if (f.kind === 'values') for (const v of f.values) qs.append(`f.${f.key}`, v);
    else {
      if (f.min !== undefined) qs.set(`fmin.${f.key}`, String(f.min));
      if (f.max !== undefined) qs.set(`fmax.${f.key}`, String(f.max));
    }
  }
}

export async function listProducts(
  p: ListingParams & { pageSize?: number },
): Promise<ProductPage | null> {
  const qs = new URLSearchParams();
  if (p.category) qs.set('category', p.category);
  if (p.brand?.length) qs.set('brand', p.brand.join(','));
  for (const a of p.attr ?? []) qs.append('attr', a);
  const scalars: [string, string | undefined][] = [
    ['minPrice', p.minPrice],
    ['maxPrice', p.maxPrice],
    ['q', p.q],
    ['sort', p.sort],
    ['page', p.page],
  ];
  for (const [k, v] of scalars) if (v) qs.set(k, v);
  if (p.pageSize) qs.set('pageSize', String(p.pageSize));
  return publicGet<ProductPage>(`/products?${qs}`);
}
