'use server';

import { stockAdjustmentSchema, thresholdSchema, ulidSchema } from '@aussie/validation';
import { revalidatePath, updateTag } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { CATALOG_TAG } from '@/lib/catalog';
import { INVENTORY_TAG } from '@/lib/inventory';
import type { ActionState } from '../actions';

function refresh(variantId: string) {
  updateTag(INVENTORY_TAG); // product pages show the new level on the next request
  updateTag(CATALOG_TAG); // listings' sold-out badges (mirrored via events, usually within a second)
  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/inventory/${variantId}`);
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
    refresh(variantId);
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
    refresh(variantId);
    return {
      ok:
        parsed.data.lowStockThreshold === null ? 'Using the store default.' : 'Alert level saved.',
    };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}
