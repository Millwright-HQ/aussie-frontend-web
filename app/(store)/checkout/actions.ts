'use server';

import type { OrderView } from '@aussie/shared-types';
import {
  checkoutSchema,
  districtSchema,
  holdProofRequestSchema,
  MAX_PROOF_BYTES,
  ulidSchema,
} from '@aussie/validation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { isSecureCookies } from '@/lib/auth/config';
import { getSession } from '@/lib/auth/session';
import { getCart, saveCart } from '@/lib/cart';
import { holdBag, readHoldId, releaseHold, writeHoldId } from '@/lib/checkout-hold';
import { describeQuote, getQuote } from '@/lib/delivery';
import { LAST_ORDER_COOKIE } from '@/lib/order-cookie';
import { bagHasUnavailable, bagSubtotal, loadBag, publicPost } from '@/lib/orders';

export interface CheckoutState {
  error?: string;
  /** The hold ran out or the bag changed: the page offers to start the checkout again. */
  restart?: boolean;
  /** Field errors by path, e.g. "shipping.phone". */
  fieldErrors?: Record<string, string>;
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

// ── Delivery fee for the district chosen in the checkout ─────────────────────

export type QuoteView =
  | {
      ok: true;
      deliveryCents: number;
      codCents: number;
      freeDelivery: boolean;
      /** Summary line, e.g. "Delivery Rs 400.00 · about 2–3 days". */
      note: string;
    }
  | { ok: false; message: string };

export async function quoteAction(district: string): Promise<QuoteView> {
  const code = districtSchema.safeParse(district);
  if (!code.success) return { ok: false, message: 'Choose your delivery district.' };
  const bag = await loadBag(await getCart());
  if (bag.length === 0 || bagHasUnavailable(bag))
    return { ok: false, message: 'Your bag changed.' };
  const result = await getQuote({
    district: code.data,
    subtotalCents: bagSubtotal(bag),
    items: bag.map((l) => ({
      weightG: l.snapshot.weightG ?? 1,
      qty: l.qty,
      ...(l.snapshot.lengthCm && l.snapshot.widthCm && l.snapshot.heightCm
        ? {
            lengthCm: l.snapshot.lengthCm,
            widthCm: l.snapshot.widthCm,
            heightCm: l.snapshot.heightCm,
          }
        : {}),
    })),
  });
  if (!result.ok) return { ok: false, message: result.message };
  const q = result.quote;
  return {
    ok: true,
    deliveryCents: q.deliveryFeeCents,
    codCents: q.codFeeCents,
    freeDelivery: q.freeDelivery,
    note: describeQuote({ ...q, codFeeCents: 0 }),
  };
}

// ── Changing the bag from inside the checkout ─────────────────────────────────

export type BagEditResult = { ok: true; empty?: boolean } | { ok: false; error: string };

/**
 * +/- in the checkout. The hold is changed to match first; if the stock is not there the bag is
 * left as it was and the customer is told how many are available.
 */
export async function changeQtyAction(variantId: string, qty: number): Promise<BagEditResult> {
  if (!ulidSchema.safeParse(variantId).success || !Number.isInteger(qty) || qty < 0 || qty > 99) {
    return { ok: false, error: 'Could not change that quantity.' };
  }
  const bag = await getCart();
  const next =
    qty === 0
      ? bag.filter((l) => l.variantId !== variantId)
      : bag.map((l) => (l.variantId === variantId ? { ...l, qty } : l));
  const holdId = await readHoldId();
  if (next.length === 0) {
    await releaseHold(holdId);
    await writeHoldId(undefined);
    await saveCart([]);
    revalidatePath('/', 'layout');
    return { ok: true, empty: true };
  }
  const outcome = await holdBag(next, holdId);
  if (!outcome.ok) {
    await writeHoldId(outcome.hold?.holdId ?? holdId);
    const short = outcome.shortages.find((s) => s.variantId === variantId);
    return {
      ok: false,
      error: short
        ? short.available === 0
          ? 'Sorry, that item has just sold out.'
          : `Only ${short.available} available.`
        : outcome.message,
    };
  }
  await writeHoldId(outcome.hold.holdId);
  await saveCart(next);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** "Update my bag": lower the quantities that the stock can no longer cover, then try again. */
export async function fixShortageAction(): Promise<void> {
  const bag = await getCart();
  const outcome = await holdBag(bag, await readHoldId());
  if (!outcome.ok && outcome.shortages.length > 0) {
    const available = new Map(outcome.shortages.map((s) => [s.variantId, s.available]));
    const fixed = bag
      .map((l) => ({ ...l, qty: Math.min(l.qty, available.get(l.variantId) ?? l.qty) }))
      .filter((l) => l.qty > 0);
    await saveCart(fixed);
    revalidatePath('/', 'layout');
    if (fixed.length === 0) {
      await releaseHold(outcome.hold?.holdId);
      await writeHoldId(undefined);
      redirect('/cart');
    }
  }
  redirect('/checkout/start');
}

// ── Bank transfer: the slip is uploaded here, before the order is completed ─────

export type HoldSlipTicket =
  { error: string } | { uploadId: string; upload: { url: string; fields: Record<string, string> } };

export async function requestSlipAction(
  contentType: string,
  size: number,
): Promise<HoldSlipTicket> {
  if (!Number.isFinite(size) || size < 1 || size > MAX_PROOF_BYTES) {
    return { error: 'The slip must be 5 MB or smaller.' };
  }
  const holdId = await readHoldId();
  if (!holdId) return { error: 'Your checkout time ran out. Please start the checkout again.' };
  const parsed = holdProofRequestSchema.safeParse({ holdId, contentType });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the file' };
  const res = await publicPost<{
    uploadId: string;
    upload: { url: string; fields: Record<string, string> };
  }>('/v1/orders/checkout/proof-upload', parsed.data);
  return res.ok ? res.data : { error: res.message };
}

// ── Completing the order ───────────────────────────────────────────────────────

/**
 * Completes the order. The bag and the hold come from cookies (never from the browser), and the
 * idempotency key was minted when the page rendered, so a double click returns the same order.
 * Bank transfer needs the slip that was uploaded in the checkout.
 */
export async function placeOrderAction(
  _prev: CheckoutState,
  form: FormData,
): Promise<CheckoutState> {
  const district = districtSchema.safeParse(text(form, 'district'));
  if (!district.success) return { error: 'Choose your delivery district first.' };
  const bag = await getCart();
  if (bag.length === 0) return { error: 'Your bag is empty.' };
  if (form.get('acceptTerms') !== 'on') {
    return {
      error: 'Please agree to the Terms and Conditions and Privacy Policy to place your order.',
    };
  }
  const holdId = await readHoldId();
  if (!holdId) {
    return {
      error: 'Your checkout time ran out and the items were released.',
      restart: true,
    };
  }
  const byTransfer = text(form, 'paymentMethod') === 'BANK_TRANSFER';
  const proofUploadId = text(form, 'proofUploadId');
  if (byTransfer && !proofUploadId) {
    return { error: 'Upload your payment slip first, then complete the order.' };
  }

  const parsed = checkoutSchema.safeParse({
    shipping: {
      fullName: text(form, 'fullName'),
      phone: text(form, 'phone'),
      line1: text(form, 'line1'),
      line2: text(form, 'line2'),
      city: text(form, 'city'),
      district: district.data,
      postalCode: text(form, 'postalCode'),
      notes: text(form, 'notes'),
    },
    email: text(form, 'email'),
    instructions: text(form, 'instructions'),
    paymentMethod: byTransfer ? 'BANK_TRANSFER' : 'COD',
    items: bag.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
    holdId,
    ...(byTransfer ? { proofUploadId } : {}),
  });
  if (!parsed.success) {
    const first = new Map<string, string>();
    for (const i of parsed.error.issues) {
      const key = i.path.join('.');
      if (!first.has(key)) first.set(key, i.message);
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors: Object.fromEntries(first) };
  }

  const idempotencyKey = text(form, 'idem');
  const headers = { 'idempotency-key': idempotencyKey };
  let order: OrderView;
  try {
    if (await getSession('customer')) {
      order = await api<OrderView>('customer', '/v1/orders/my/checkout', {
        method: 'POST',
        body: parsed.data,
        headers,
      });
    } else {
      const res = await publicPost<OrderView>('/v1/orders/checkout', parsed.data, headers);
      if (!res.ok) return { error: res.message, restart: /ran out|released/i.test(res.message) };
      order = res.data;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.userMessage, restart: /ran out|released/i.test(err.userMessage) };
    }
    throw err;
  }

  await saveCart([]);
  await writeHoldId(undefined); // the hold is now the order
  (await cookies()).set(
    LAST_ORDER_COOKIE,
    JSON.stringify({ n: order.orderNumber, p: order.shipping.phone }),
    {
      httpOnly: true,
      secure: isSecureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    },
  );
  revalidatePath('/', 'layout');
  redirect('/order/placed');
}
