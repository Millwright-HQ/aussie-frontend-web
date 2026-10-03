'use server';

import type { OrderView } from '@aussie/shared-types';
import { trackSchema } from '@aussie/validation';
import { publicPost } from '@/lib/orders';

export interface TrackState {
  error?: string;
  order?: OrderView;
}

/** Guests look an order up with its number and the phone it was placed with (a POST, so the phone never lands in a URL). */
export async function trackAction(_prev: TrackState, form: FormData): Promise<TrackState> {
  const parsed = trackSchema.safeParse({
    orderNumber: form.get('orderNumber'),
    phone: form.get('phone'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the details' };
  const res = await publicPost<OrderView>('/v1/orders/track', parsed.data);
  return res.ok ? { order: res.data } : { error: res.message };
}
