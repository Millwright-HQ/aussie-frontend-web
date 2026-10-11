'use server';

import { newsletterSignupSchema } from '@aussie/validation';
import { publicPost } from '@/lib/orders';

export interface NewsletterState {
  ok?: string;
  error?: string;
}

/** Footer and coming-soon sign-up: the visitor's email goes onto the newsletter / launch list. */
export async function subscribeAction(
  _prev: NewsletterState,
  form: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSignupSchema.safeParse({
    email: form.get('email') ?? '',
    source: form.get('source') ?? 'footer',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter your email' };

  const res = await publicPost<{ ok: boolean }>('/v1/content/newsletter', parsed.data);
  if (!res.ok) return { error: res.message };
  return { ok: 'Thank you! You are on the list.' };
}
