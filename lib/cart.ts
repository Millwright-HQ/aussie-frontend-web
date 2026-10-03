import 'server-only';
import { MAX_ORDER_LINES, MAX_QTY_PER_LINE, ulidSchema } from '@aussie/validation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isSecureCookies } from './auth/config';
import { type CartLine } from './cart-model';

/**
 * The shopping bag lives in a cookie as ids and quantities only. Prices, names and stock are never
 * stored here: the bag page and checkout read them fresh from the catalog, so an edited cookie
 * cannot change what anyone pays.
 */
const COOKIE = 'aussie_bag';
const MAX_AGE_S = 30 * 24 * 3600;

const stored = z
  .array(
    z
      .object({ p: ulidSchema, v: ulidSchema, q: z.number().int().min(1).max(MAX_QTY_PER_LINE) })
      .strict(),
  )
  .max(MAX_ORDER_LINES);

export async function getCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = stored.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    // One line per variant even if the cookie was tampered with.
    const seen = new Set<string>();
    return parsed.data
      .filter((l) => !seen.has(l.v) && seen.add(l.v))
      .map((l) => ({ productId: l.p, variantId: l.v, qty: l.q }));
  } catch {
    return [];
  }
}

export async function saveCart(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  if (lines.length === 0) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(
    COOKIE,
    JSON.stringify(lines.map((l) => ({ p: l.productId, v: l.variantId, q: l.qty }))),
    {
      httpOnly: true,
      secure: isSecureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_S,
    },
  );
}

export { cartCount, withLine } from './cart-model';
export type { CartLine } from './cart-model';
