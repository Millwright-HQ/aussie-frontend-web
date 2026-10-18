'use server';

import { promotionInputSchema, promotionUpdateSchema, ulidSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { fromColomboInput, rupeesToCents } from '@/lib/promotions';
import type { ActionState } from '../actions';

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};
const whole = (form: FormData, key: string) => {
  const v = text(form, key).trim();
  return v === '' ? undefined : Number(v);
};

/** The form's fields as the API expects them: rupees become cents, local times become ISO times. */
function fields(form: FormData) {
  const kind = text(form, 'kind');
  const scope = kind === 'FREE_DELIVERY' ? 'ORDER' : text(form, 'scope');
  return {
    name: text(form, 'name'),
    kind,
    value:
      kind === 'PERCENT'
        ? Number(text(form, 'value'))
        : kind === 'FIXED'
          ? rupeesToCents(text(form, 'value'))
          : 0,
    scope,
    targetIds: scope === 'ORDER' ? [] : form.getAll('targetIds').map(String),
    maxUses: whole(form, 'maxUses'),
    startsAt: fromColomboInput(text(form, 'startsAt')),
    endsAt: fromColomboInput(text(form, 'endsAt')),
    minSubtotalCents: rupeesToCents(text(form, 'minSubtotal')),
    maxDiscountCents: rupeesToCents(text(form, 'maxDiscount')),
    active: form.get('active') === 'on',
  };
}

export async function createPromotionAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = promotionInputSchema.safeParse({ code: text(form, 'code'), ...fields(form) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', '/v1/orders/admin/promotions', { method: 'POST', body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/promotions');
  redirect('/admin/promotions');
}

export async function updatePromotionAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = ulidSchema.safeParse(text(form, 'id'));
  if (!id.success) return { error: 'Invalid promotion' };
  const parsed = promotionUpdateSchema.safeParse(fields(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', `/v1/orders/admin/promotions/${id.data}`, {
      method: 'PUT',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${id.data}`);
  return { ok: 'Promotion saved.' };
}

export async function deletePromotionAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = ulidSchema.safeParse(text(form, 'id'));
  if (!id.success) return { error: 'Invalid promotion' };
  try {
    await api('admin', `/v1/orders/admin/promotions/${id.data}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/promotions');
  redirect('/admin/promotions');
}
