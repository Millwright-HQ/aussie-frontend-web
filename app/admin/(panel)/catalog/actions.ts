'use server';

import { randomInt } from 'node:crypto';

import type { ProductDetail } from '@aussie/shared-types';
import {
  attributeDefCreateSchema,
  attributeDefUpdateSchema,
  brandInputSchema,
  categoryInputSchema,
  imageOrderSchema,
  imageUpdateSchema,
  imageUploadRequestSchema,
  keySchema,
  optionDefCreateSchema,
  optionDefUpdateSchema,
  type ProductInput,
  productInputSchema,
  ulidSchema,
} from '@aussie/validation';
import { updateTag } from 'next/cache';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { CATALOG_TAG } from '@/lib/catalog';

export interface SaveResult {
  ok?: boolean;
  product?: ProductDetail;
  error?: string;
  /** API validation errors keyed by field path, e.g. "variants.0.sku". */
  fieldErrors?: Record<string, string>;
}

export interface ActionState {
  ok?: string;
  error?: string;
}

function apiFieldErrors(err: ApiError): Record<string, string> {
  const out = new Map<string, string>();
  for (const e of err.problem.errors ?? []) {
    const m = /^([\w.]+): (.*)$/.exec(e.message);
    if (m?.[1] && m[2] && !out.has(m[1])) out.set(m[1], m[2]);
  }
  return Object.fromEntries(out);
}

function refresh(...paths: string[]) {
  updateTag(CATALOG_TAG); // storefront sees the change on the next request
  for (const p of paths) revalidatePath(p);
}

export async function saveProductAction(
  productId: string | null,
  input: unknown,
): Promise<SaveResult> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please fix the highlighted fields.' };
  if (productId && !ulidSchema.safeParse(productId).success) return { error: 'Invalid product' };
  try {
    const product = await api<ProductDetail>(
      'admin',
      productId ? `/v1/catalog/admin/products/${productId}` : '/v1/catalog/admin/products',
      {
        method: productId ? 'PUT' : 'POST',
        body: parsed.data satisfies ProductInput,
      },
    );
    refresh('/admin/products');
    return { ok: true, product };
  } catch (err) {
    if (err instanceof ApiError)
      return { error: err.userMessage, fieldErrors: apiFieldErrors(err) };
    throw err;
  }
}

export async function deleteProductAction(productId: string): Promise<ActionState> {
  if (!ulidSchema.safeParse(productId).success) return { error: 'Invalid product' };
  try {
    await api('admin', `/v1/catalog/admin/products/${productId}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  refresh('/admin/products');
  return { ok: 'Product deleted.' };
}

// ── Images ────────────────────────────────────────────────────────────────────

export interface UploadTicket {
  error?: string;
  image?: ProductDetail['images'][number];
  upload?: { url: string; fields: Record<string, string> };
}

export async function requestImageUpload(
  productId: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const parsed = imageUploadRequestSchema.safeParse({ contentType, size });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Unsupported file' };
  if (!ulidSchema.safeParse(productId).success) return { error: 'Invalid product' };
  try {
    return await api<UploadTicket>('admin', `/v1/catalog/admin/products/${productId}/images`, {
      method: 'POST',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}

async function imageCall(fn: () => Promise<unknown>, productId: string): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  refresh(`/admin/products/${productId}`);
  return { ok: 'Saved' };
}

export async function updateImageAction(
  productId: string,
  imageId: string,
  alt: string,
  variantId: string | null,
) {
  const parsed = imageUpdateSchema.safeParse({ alt, variantId });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid' };
  if (![productId, imageId].every((id) => ulidSchema.safeParse(id).success))
    return { error: 'Invalid image' };
  return imageCall(
    () =>
      api('admin', `/v1/catalog/admin/products/${productId}/images/${imageId}`, {
        method: 'PUT',
        body: parsed.data,
      }),
    productId,
  );
}

export async function reorderImagesAction(productId: string, imageIds: string[]) {
  const parsed = imageOrderSchema.safeParse({ imageIds });
  if (!parsed.success || !ulidSchema.safeParse(productId).success)
    return { error: 'Invalid order' };
  return imageCall(
    () =>
      api('admin', `/v1/catalog/admin/products/${productId}/image-order`, {
        method: 'PUT',
        body: parsed.data,
      }),
    productId,
  );
}

export async function deleteImageAction(productId: string, imageId: string) {
  if (![productId, imageId].every((id) => ulidSchema.safeParse(id).success))
    return { error: 'Invalid image' };
  return imageCall(
    () =>
      api('admin', `/v1/catalog/admin/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      }),
    productId,
  );
}

// ── Taxonomy (form actions) ─────────────────────────────────────────────────

const text = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === 'string' ? v : undefined;
};

async function taxonomyCall(
  fn: () => Promise<unknown>,
  ok: string,
  path: string,
): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  refresh(path);
  return { ok };
}

export async function saveCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = categoryInputSchema.safeParse({
    name: text(form, 'name'),
    slug: text(form, 'slug'),
    parentId: text(form, 'parentId') ?? null,
    description: text(form, 'description'),
    imagePath: text(form, 'imagePath'),
    sortOrder: text(form, 'sortOrder') ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const id = text(form, 'id');
  if (id && !ulidSchema.safeParse(id).success) return { error: 'Invalid category' };
  return taxonomyCall(
    () =>
      api('admin', id ? `/v1/catalog/admin/categories/${id}` : '/v1/catalog/admin/categories', {
        method: id ? 'PUT' : 'POST',
        body: parsed.data,
      }),
    id ? 'Category saved.' : `Category "${parsed.data.name}" added.`,
    '/admin/products/categories',
  );
}

export async function saveBrandAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = brandInputSchema.safeParse({
    name: text(form, 'name'),
    slug: text(form, 'slug'),
    description: text(form, 'description'),
    countryOfOrigin: text(form, 'countryOfOrigin'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const id = text(form, 'id');
  if (id && !ulidSchema.safeParse(id).success) return { error: 'Invalid brand' };
  return taxonomyCall(
    () =>
      api('admin', id ? `/v1/catalog/admin/brands/${id}` : '/v1/catalog/admin/brands', {
        method: id ? 'PUT' : 'POST',
        body: parsed.data,
      }),
    id ? 'Brand saved.' : `Brand "${parsed.data.name}" added.`,
    '/admin/products/brands',
  );
}

export async function deleteTaxonomyAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const kind = text(form, 'kind');
  const id = text(form, 'id');
  if (!id || !ulidSchema.safeParse(id).success) return { error: 'Invalid item' };
  const path = kind === 'category' ? 'categories' : kind === 'brand' ? 'brands' : null;
  if (!path) return { error: 'Invalid item' };
  return taxonomyCall(
    () => api('admin', `/v1/catalog/admin/${path}/${id}`, { method: 'DELETE' }),
    'Deleted.',
    kind === 'category' ? '/admin/products/categories' : '/admin/products/brands',
  );
}

// ── Category attributes and variant options ──────────────────────────────────

const flag = (form: FormData, k: string) => form.get(k) === 'on';
const lines = (form: FormData, k: string) =>
  (text(form, k) ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Creates (no `key` field) or updates (hidden `key` field) one attribute of a category. */
export async function saveAttributeAction(
  categoryId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(categoryId).success) return { error: 'Invalid category' };
  const existingKey = text(form, 'key');
  const fields = {
    label: text(form, 'label'),
    unit: text(form, 'unit'),
    choices: lines(form, 'choices'),
    long: flag(form, 'long'),
    filterable: flag(form, 'filterable'),
    required: flag(form, 'required'),
    sortOrder: text(form, 'sortOrder') ?? 0,
  };
  if (existingKey) {
    if (!keySchema.safeParse(existingKey).success) return { error: 'Invalid attribute' };
    const parsed = attributeDefUpdateSchema.safeParse(fields);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
    return taxonomyCall(
      () =>
        api('admin', `/v1/catalog/admin/categories/${categoryId}/attributes/${existingKey}`, {
          method: 'PUT',
          body: parsed.data,
        }),
      'Saved.',
      `/admin/products/categories/${categoryId}`,
    );
  }
  const parsed = attributeDefCreateSchema.safeParse({ ...fields, type: text(form, 'type') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return taxonomyCall(
    () =>
      api('admin', `/v1/catalog/admin/categories/${categoryId}/attributes`, {
        method: 'POST',
        body: parsed.data,
      }),
    `"${parsed.data.label}" added.`,
    `/admin/products/categories/${categoryId}`,
  );
}

export async function saveOptionAction(
  categoryId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(categoryId).success) return { error: 'Invalid category' };
  const existingKey = text(form, 'key');
  const fields = {
    label: text(form, 'label'),
    suggestions: lines(form, 'suggestions'),
    sortOrder: text(form, 'sortOrder') ?? 0,
  };
  if (existingKey) {
    if (!keySchema.safeParse(existingKey).success) return { error: 'Invalid option' };
    const parsed = optionDefUpdateSchema.safeParse(fields);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
    return taxonomyCall(
      () =>
        api('admin', `/v1/catalog/admin/categories/${categoryId}/options/${existingKey}`, {
          method: 'PUT',
          body: parsed.data,
        }),
      'Saved.',
      `/admin/products/categories/${categoryId}`,
    );
  }
  const parsed = optionDefCreateSchema.safeParse({ ...fields, kind: text(form, 'kind') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return taxonomyCall(
    () =>
      api('admin', `/v1/catalog/admin/categories/${categoryId}/options`, {
        method: 'POST',
        body: parsed.data,
      }),
    `"${parsed.data.label}" added.`,
    `/admin/products/categories/${categoryId}`,
  );
}

export async function deleteDefinitionAction(
  categoryId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const kind = text(form, 'kind');
  const key = text(form, 'key');
  if (!ulidSchema.safeParse(categoryId).success || !key || !keySchema.safeParse(key).success) {
    return { error: 'Invalid item' };
  }
  const path = kind === 'attribute' ? 'attributes' : kind === 'option' ? 'options' : null;
  if (!path) return { error: 'Invalid item' };
  return taxonomyCall(
    () =>
      api('admin', `/v1/catalog/admin/categories/${categoryId}/${path}/${key}`, {
        method: 'DELETE',
      }),
    'Deleted.',
    `/admin/products/categories/${categoryId}`,
  );
}

/**
 * Makes a draft copy of a product (details, options, prices and stock-keeping codes with a new
 * suffix). Pictures are not copied: upload fresh ones on the copy. Returns the new product's id.
 */
export async function duplicateProductAction(
  productId: string,
): Promise<{ id?: string; error?: string }> {
  if (!ulidSchema.safeParse(productId).success) return { error: 'Invalid product' };
  try {
    const source = await api<ProductDetail>('admin', `/v1/catalog/admin/products/${productId}`);
    const suffix = `C${randomInt(36 ** 3)
      .toString(36)
      .padStart(3, '0')
      .toUpperCase()}`;
    const parsed = productInputSchema.safeParse({
      name: `${source.name} (copy)`.slice(0, 150),
      brandId: source.brandId,
      categoryIds: source.categoryIds,
      status: 'DRAFT',
      description: source.description,
      highlights: source.highlights,
      countryOfOrigin: source.countryOfOrigin,
      attributes: source.attributes,
      optionKeys: source.optionKeys,
      variants: source.variants.map((v) => ({
        // Codes must be unique, so the copy gets its own ending.
        sku: `${v.sku.slice(0, 40 - suffix.length - 1)}-${suffix}`,
        options: v.options,
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents,
        weightG: v.weightG,
        lengthCm: v.lengthCm,
        widthCm: v.widthCm,
        heightCm: v.heightCm,
        isDefault: v.isDefault,
      })),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Could not copy it' };
    const created = await api<ProductDetail>('admin', '/v1/catalog/admin/products', {
      method: 'POST',
      body: parsed.data satisfies ProductInput,
    });
    refresh('/admin/products');
    return { id: created.id };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}
