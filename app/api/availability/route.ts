import { ulidSchema } from '@aussie/validation';
import { type NextRequest, NextResponse } from 'next/server';
import { availabilityLabel, availableUnits, getAvailability } from '@/lib/inventory';

/**
 * Live stock for a product page (never cached), so the numbers follow checkout holds and
 * releases without a reload. Variants missing from the answer are sold out, as on the page.
 */
export async function GET(request: NextRequest) {
  const id = ulidSchema.safeParse(request.nextUrl.searchParams.get('productId'));
  if (!id.success) return NextResponse.json({ error: 'Bad product' }, { status: 400 });
  const availability = await getAvailability(id.data, { fresh: true });
  if (!availability) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  const variants = Object.fromEntries(
    Object.entries(availability).map(([variantId, a]) => [
      variantId,
      {
        out: a.status === 'out',
        label: availabilityLabel(a),
        low: a.status === 'low',
        max: availableUnits(a),
      },
    ]),
  );
  return NextResponse.json({ variants }, { headers: { 'cache-control': 'no-store' } });
}
