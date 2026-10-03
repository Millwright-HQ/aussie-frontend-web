'use server';

import { ulidSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface CancelState {
  error?: string;
  ok?: string;
}

/** A customer can cancel their own order while it is still waiting for confirmation. */
export async function cancelOrderAction(orderId: string, _prev: CancelState): Promise<CancelState> {
  if (!ulidSchema.safeParse(orderId).success) return { error: 'Invalid order' };
  try {
    await api('customer', `/v1/orders/my/${orderId}/cancel`, { method: 'POST' });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/account/orders');
  revalidatePath(`/account/orders/${orderId}`);
  return { ok: 'Your order was cancelled.' };
}
