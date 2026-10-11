import { NextResponse } from 'next/server';
import { readHoldId, releaseHold, writeHoldId } from '@/lib/checkout-hold';

/**
 * Called by the checkout page (sendBeacon) when the customer leaves without ordering: gives the
 * held stock back right away. The 30-minute sweep stays as the safety net for closed tabs and
 * lost connections. Does nothing when there is no hold, so it is safe to call twice.
 */
export async function POST() {
  const holdId = await readHoldId();
  if (holdId) {
    await releaseHold(holdId).catch(() => undefined);
    await writeHoldId(undefined);
  }
  return new NextResponse(null, { status: 204 });
}
