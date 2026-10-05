import { districtSchema, ulidSchema } from '@aussie/validation';
import { type NextRequest, NextResponse } from 'next/server';
import { holdBag, readHoldId, writeHoldId } from '@/lib/checkout-hold';
import { getCart } from '@/lib/cart';

/**
 * Where "Check out" goes: take (hold) the stock for the bag, remember the hold in a cookie, then
 * open the checkout. Also adopts a hold the checkout page made (`adopt`) after it had to change it.
 */
export async function GET(request: NextRequest) {
  const bag = await getCart();
  const url = request.nextUrl;
  if (bag.length === 0) return NextResponse.redirect(new URL('/cart', url));

  const adopt = ulidSchema.safeParse(url.searchParams.get('adopt'));
  const outcome = await holdBag(bag, adopt.success ? adopt.data : await readHoldId());

  const next = new URL('/checkout', url);
  const district = districtSchema.safeParse(url.searchParams.get('district'));
  if (district.success) next.searchParams.set('district', district.data);

  if (outcome.ok) {
    await writeHoldId(outcome.hold.holdId);
  } else {
    // Keep what the customer already had; otherwise nothing is held and the page says why.
    await writeHoldId(outcome.hold?.holdId);
    next.searchParams.set('short', '1');
  }
  return NextResponse.redirect(next);
}
