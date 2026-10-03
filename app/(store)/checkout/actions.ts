'use server';

import type { OrderView } from '@aussie/shared-types';
import { checkoutSchema, districtSchema } from '@aussie/validation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { isSecureCookies } from '@/lib/auth/config';
import { getSession } from '@/lib/auth/session';
import { getCart, saveCart } from '@/lib/cart';
import { LAST_ORDER_COOKIE } from '@/lib/order-cookie';
import { publicPost } from '@/lib/orders';

export interface CheckoutState {
  error?: string;
  /** Field errors by path, e.g. "shipping.phone". */
  fieldErrors?: Record<string, string>;
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

/**
 * Places the order. The bag comes from the cookie and the idempotency key was minted when the page
 * rendered, so a double click or a retry returns the same order instead of placing a second one.
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
    paymentMethod: text(form, 'paymentMethod') === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'COD',
    items: bag.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
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
      if (!res.ok) return { error: res.message };
      order = res.data;
    }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }

  await saveCart([]);
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
