'use server';

import { ORDER_STATUSES, type OrderStatus } from '@aussie/shared-types';
import {
  orderNoteSchema,
  paymentDecisionSchema,
  refundSchema,
  shippingEditSchema,
  statusChangeSchema,
  ulidSchema,
} from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ActionState } from '../actions';

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : undefined;
};

/** Rupees → cents; empty → undefined. */
const cents = (v: string | undefined) => {
  const clean = (v ?? '').replace(/,/g, '').trim();
  return clean === '' ? undefined : Math.round(Number(clean) * 100);
};

/** Moves an order to `to` (the page only offers allowed steps; the API enforces them again). */
export async function changeStatusAction(
  orderId: string,
  to: OrderStatus,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(orderId).success || !ORDER_STATUSES.includes(to)) {
    return { error: 'Invalid order' };
  }
  const parsed = statusChangeSchema.safeParse({
    to,
    note: text(form, 'note'),
    customerNote: text(form, 'customerNote'),
    courier: text(form, 'courier'),
    trackingNo: text(form, 'trackingNo'),
    codCollectedCents: cents(text(form, 'codCollected')),
    ...(to === 'RETURNED' ? { restock: form.get('restock') === 'on' } : {}),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', `/v1/orders/admin/orders/${orderId}/status`, {
      method: 'POST',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin');
  return { ok: 'Updated.' };
}

/** Confirms the customer's bank transfer (the order becomes CONFIRMED) or rejects the slip. */
export async function decidePaymentAction(
  orderId: string,
  decision: 'confirm' | 'reject',
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(orderId).success) return { error: 'Invalid order' };
  const parsed = paymentDecisionSchema.safeParse({ decision, note: text(form, 'note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  try {
    await api('admin', `/v1/orders/admin/orders/${orderId}/payment`, {
      method: 'POST',
      body: parsed.data,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin');
  return {
    ok: decision === 'confirm' ? 'Payment confirmed. The order is confirmed.' : 'Slip rejected.',
  };
}

/** A staff-only note on the order. */
export async function addNoteAction(
  orderId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(orderId).success) return { error: 'Invalid order' };
  const parsed = orderNoteSchema.safeParse({ note: text(form, 'note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Write the note' };
  return orderCall(
    () =>
      api('admin', `/v1/orders/admin/orders/${orderId}/notes`, {
        method: 'POST',
        body: parsed.data,
      }),
    'Note added.',
    orderId,
  );
}

/** Correct where the parcel goes, before it leaves. */
export async function editShippingAction(
  orderId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(orderId).success) return { error: 'Invalid order' };
  const parsed = shippingEditSchema.safeParse({
    fullName: text(form, 'fullName'),
    phone: text(form, 'phone'),
    line1: text(form, 'line1'),
    line2: text(form, 'line2'),
    city: text(form, 'city'),
    postalCode: text(form, 'postalCode'),
    notes: text(form, 'notes'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return orderCall(
    () =>
      api('admin', `/v1/orders/admin/orders/${orderId}/shipping`, {
        method: 'PUT',
        body: parsed.data,
      }),
    'Delivery details saved.',
    orderId,
  );
}

/** The customer has been paid back. */
export async function refundAction(
  orderId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(orderId).success) return { error: 'Invalid order' };
  const parsed = refundSchema.safeParse({ note: text(form, 'note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return orderCall(
    () =>
      api('admin', `/v1/orders/admin/orders/${orderId}/refund`, {
        method: 'POST',
        body: parsed.data,
      }),
    'Refund recorded.',
    orderId,
  );
}

async function orderCall(
  call: () => Promise<unknown>,
  ok: string,
  orderId: string,
): Promise<ActionState> {
  try {
    await call();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok };
}
