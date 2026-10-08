'use server';

import { siteDiscountSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ActionState } from '@/app/admin/(panel)/actions';

/** The store-wide discount: this percentage comes off every price in the shop. */
export async function saveSiteDiscountAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const raw = form.get('percent');
  const parsed = siteDiscountSchema.safeParse({
    percent: typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the number' };
  try {
    await api('admin', '/v1/catalog/admin/pricing', { method: 'PUT', body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/', 'layout');
  return {
    ok:
      parsed.data.percent === 0
        ? 'Saved. The store-wide discount is off.'
        : `Saved. Every price in the shop is now ${parsed.data.percent}% lower.`,
  };
}
