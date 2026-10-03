'use server';

import { moderationSchema, ulidSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ActionState } from '../actions';

/** Approves or rejects a review (the API checks `review:moderate` and the current status again). */
export async function moderateReviewAction(
  productId: string,
  reviewId: string,
  decision: 'approve' | 'reject',
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(productId).success || !ulidSchema.safeParse(reviewId).success) {
    return { error: 'Invalid review' };
  }
  const reason = form.get('reason');
  const parsed = moderationSchema.safeParse({
    decision,
    reason: typeof reason === 'string' ? reason : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', `/v1/reviews/admin/${productId}/${reviewId}/moderate`, {
      method: 'POST',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/reviews');
  return { ok: decision === 'approve' ? 'Approved and published.' : 'Rejected.' };
}
