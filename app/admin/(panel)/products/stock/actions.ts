'use server';

import type { ProductDetail } from '@aussie/shared-types';
import { stockAdjustmentSchema, thresholdSchema, ulidSchema } from '@aussie/validation';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { CATALOG_TAG } from '@/lib/catalog';
import { INVENTORY_TAG } from '@/lib/inventory';
import type { ActionState } from '@/app/admin/(panel)/actions';

function refresh() {
  updateTag(INVENTORY_TAG); // product pages show the new level on the next request
  updateTag(CATALOG_TAG); // listings' sold-out badges (mirrored via events, usually within a second)
  revalidatePath('/admin/products', 'layout'); // product pages, stock lists and history
}

export async function adjustStockAction(
  variantId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(variantId).success) return { error: 'Invalid variant' };
  const parsed = stockAdjustmentSchema.safeParse({
    delta: form.get('delta'),
    reason: form.get('reason'),
    note: form.get('note') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    const out = await api<{ onHand: number }>(
      'admin',
      `/v1/inventory/admin/stock/${variantId}/adjust`,
      {
        method: 'POST',
        body: parsed.data,
      },
    );
    refresh();
    const d = parsed.data.delta;
    return { ok: `${d > 0 ? 'Added' : 'Removed'} ${Math.abs(d)}. On hand now ${out.onHand}.` };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}

export async function setThresholdAction(
  variantId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(variantId).success) return { error: 'Invalid variant' };
  const parsed = thresholdSchema.safeParse({
    lowStockThreshold: form.get('lowStockThreshold') ?? '',
  });
  if (!parsed.success)
    return { error: 'Enter a whole number from 0, or leave empty for the default' };
  try {
    await api('admin', `/v1/inventory/admin/stock/${variantId}/threshold`, {
      method: 'PUT',
      body: parsed.data,
    });
    refresh();
    return {
      ok:
        parsed.data.lowStockThreshold === null ? 'Using the store default.' : 'Alert level saved.',
    };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}

const openingSchema = z
  .array(
    z
      .object({
        sku: z.string().min(1).max(60),
        units: z.number().int().min(0).max(100_000),
        alertAt: z.number().int().min(0).max(10_000).nullable(),
      })
      .strict(),
  )
  .max(40);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opening stock for a product that was just created. The stock rows are made by an event a moment
 * after the product is saved, so each call is retried for a few seconds until its row exists.
 */
export async function applyOpeningStockAction(
  productId: string,
  entries: unknown,
): Promise<ActionState> {
  const parsed = openingSchema.safeParse(entries);
  if (!parsed.success || !ulidSchema.safeParse(productId).success) {
    return { error: 'Check the opening stock numbers.' };
  }
  const wanted = parsed.data.filter((e) => e.units > 0 || e.alertAt !== null);
  if (wanted.length === 0) return { ok: 'Saved.' };
  try {
    const product = await api<ProductDetail>('admin', `/v1/catalog/admin/products/${productId}`);
    const idOf = new Map(product.variants.map((v) => [v.sku, v.id]));
    for (const entry of wanted) {
      const variantId = idOf.get(entry.sku);
      if (!variantId) continue;
      const attempt = async (fn: () => Promise<unknown>) => {
        let last: unknown;
        for (let i = 0; i < 12; i++) {
          try {
            await fn();
            return;
          } catch (err) {
            last = err;
            if (!(err instanceof ApiError) || err.status >= 500) throw err;
            await sleep(500);
          }
        }
        throw last;
      };
      if (entry.units > 0) {
        await attempt(() =>
          api('admin', `/v1/inventory/admin/stock/${variantId}/adjust`, {
            method: 'POST',
            body: { delta: entry.units, reason: 'RECEIVED', note: 'Opening stock' },
          }),
        );
      }
      if (entry.alertAt !== null) {
        await attempt(() =>
          api('admin', `/v1/inventory/admin/stock/${variantId}/threshold`, {
            method: 'PUT',
            body: { lowStockThreshold: entry.alertAt },
          }),
        );
      }
    }
    refresh();
    return { ok: 'Opening stock saved.' };
  } catch {
    return {
      error:
        'The product was saved, but its opening stock could not be set yet. Set it from the Stock section of the product page.',
    };
  }
}
