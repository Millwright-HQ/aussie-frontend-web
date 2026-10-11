'use server';

import { inquiryStatusSchema, ulidSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ActionState } from '../actions';

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

/** Moves a Contact page message to a new status, with an optional internal note. */
export async function updateInquiryAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = ulidSchema.safeParse(text(form, 'id'));
  const parsed = inquiryStatusSchema.safeParse({
    status: text(form, 'status'),
    note: text(form, 'note'),
  });
  if (!id.success || !parsed.success) {
    return { error: parsed.error?.issues[0]?.message ?? 'Could not find that message' };
  }
  try {
    await api('admin', `/v1/content/admin/inquiries/${id.data}`, {
      method: 'PUT',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/inquiries');
  return { ok: 'Saved' };
}
