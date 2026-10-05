'use server';

import { bankDetailsSchema, paymentSettingsSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ActionState } from '@/app/admin/(panel)/actions';

export async function saveBankDetailsAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === 'string' ? v : '';
  };
  const parsed = bankDetailsSchema.safeParse({
    accountName: text('accountName'),
    bankName: text('bankName'),
    branch: text('branch'),
    accountNumber: text('accountNumber'),
    instructions: text('instructions'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', '/v1/orders/admin/bank-details', { method: 'PUT', body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/site/payments');
  return { ok: 'Saved. Customers can now choose bank transfer at checkout.' };
}

/** How long a bank-transfer customer has to upload a slip before the order is cancelled. */
export async function savePaymentWindowAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const raw = form.get('windowHours');
  const parsed = paymentSettingsSchema.safeParse({
    windowHours: typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the number' };
  try {
    await api('admin', '/v1/orders/admin/payment-settings', { method: 'PUT', body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/site/payments');
  return {
    ok:
      parsed.data.windowHours === 0
        ? 'Saved. Unpaid orders are never cancelled automatically.'
        : 'Saved.',
  };
}
