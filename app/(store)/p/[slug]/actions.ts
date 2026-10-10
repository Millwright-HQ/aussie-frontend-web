'use server';

import { waitlistSignupSchema } from '@aussie/validation';
import { publicPost } from '@/lib/orders';

export interface WaitlistState {
  ok?: string;
  error?: string;
}

/** "Tell me when it is back" for a sold-out variant. The server re-checks that it really is sold out. */
export async function joinWaitlistAction(
  _prev: WaitlistState,
  form: FormData,
): Promise<WaitlistState> {
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === 'string' ? v : '';
  };
  const parsed = waitlistSignupSchema.safeParse({
    productId: text('productId'),
    variantId: text('variantId'),
    slug: text('slug'),
    email: text('email'),
    name: text('name'),
    phone: text('phone'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check your details' };

  const res = await publicPost<{ ok: boolean }>('/v1/inventory/waitlist', parsed.data);
  if (!res.ok) return { error: res.message };
  return { ok: `Thanks! We will email ${parsed.data.email} as soon as it is back.` };
}
