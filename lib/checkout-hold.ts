import 'server-only';
import type { CheckoutHold, CheckoutHoldResult } from '@aussie/shared-types';
import { ulidSchema } from '@aussie/validation';
import { cookies } from 'next/headers';
import { isSecureCookies } from './auth/config';
import type { CartLine } from './cart-model';
import { publicPost } from './orders';

/**
 * While a customer is in the checkout the stock for their bag is held (taken off sale) for a
 * limited time. The bag itself holds nothing. The hold id lives in this cookie; the order service
 * owns the truth (what is held, until when) and gives the stock back when time is up.
 */
export const HOLD_COOKIE = 'aussie_hold';

export async function readHoldId(): Promise<string | undefined> {
  const raw = (await cookies()).get(HOLD_COOKIE)?.value;
  return raw && ulidSchema.safeParse(raw).success ? raw : undefined;
}

/** Server actions and route handlers only (cookies cannot be written while rendering). */
export async function writeHoldId(holdId: string | undefined) {
  const jar = await cookies();
  if (!holdId) {
    jar.delete(HOLD_COOKIE);
    return;
  }
  jar.set(HOLD_COOKIE, holdId, {
    httpOnly: true,
    secure: isSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
}

export type HoldOutcome =
  | { ok: true; hold: CheckoutHold }
  | {
      ok: false;
      message: string;
      shortages: { variantId: string; requested: number; available: number }[];
      hold?: CheckoutHold;
    };

/** Holds the bag's stock (or changes the hold to match the bag). Never throws for a shortage. */
export async function holdBag(bag: CartLine[], holdId?: string): Promise<HoldOutcome> {
  const res = await publicPost<CheckoutHoldResult>('/v1/orders/checkout/hold', {
    items: bag.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
    ...(holdId ? { holdId } : {}),
  });
  if (!res.ok) return { ok: false, message: res.message, shortages: [] };
  if (res.data.ok) {
    const { holdId: id, expiresAt, lines } = res.data;
    return { ok: true, hold: { holdId: id, expiresAt, lines } };
  }
  return {
    ok: false,
    message: res.data.message ?? 'Some items are no longer available in the quantity you chose.',
    shortages: res.data.shortages,
    ...(res.data.hold ? { hold: res.data.hold } : {}),
  };
}

/** Gives the held stock back right away (the bag was emptied or the customer left). */
export async function releaseHold(holdId: string | undefined) {
  if (!holdId) return;
  await publicPost('/v1/orders/checkout/hold/release', { holdId });
}
