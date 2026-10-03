'use server';

import { reviewInputSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { getSession } from '@/lib/auth/session';

export interface ReviewFormState {
  ok?: string;
  error?: string;
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : undefined;
};

/** A review needs a delivered purchase; the API checks that again. It starts as "waiting for approval". */
export async function submitReviewAction(
  productId: string,
  slug: string,
  _prev: ReviewFormState,
  form: FormData,
): Promise<ReviewFormState> {
  if (!(await getSession('customer'))) return { error: 'Please sign in to write a review.' };
  const parsed = reviewInputSchema.safeParse({
    productId,
    rating: text(form, 'rating'),
    title: text(form, 'title'),
    body: text(form, 'body'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check your review' };
  try {
    await api('customer', '/v1/reviews/my', { method: 'POST', body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath('/account/reviews');
  return { ok: 'Thank you! Your review will appear once we have approved it.' };
}
