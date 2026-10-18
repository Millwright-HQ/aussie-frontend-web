import { TRACK_PATH, ulidSchema } from '@aussie/validation';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordEvent } from '@/lib/track';

const bodySchema = z
  .object({
    type: z.enum(['view', 'product']),
    path: z.string().max(120).optional(),
    productId: ulidSchema.optional(),
    /** The full referrer address; only its host is kept. */
    ref: z.string().max(300).optional(),
    campaign: z.string().max(100).optional(),
    entry: z.boolean().optional(),
  })
  .strict();

/** `https://www.instagram.com/x?y` -> `instagram.com`; anything odd -> nothing. */
function hostOf(ref?: string): string | undefined {
  if (!ref) return undefined;
  try {
    const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9.-]{3,60}$/.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The shop reports page views and product views here (sendBeacon). Always answers 204: whether
 * the event was counted is not the visitor's business, and a bad request must not show an error.
 */
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return done;
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return done;
  const { type, path, productId, ref, campaign, entry } = parsed.data;

  if (type === 'view') {
    const clean = path && path.length > 1 ? path.replace(/\/+$/, '') : path;
    if (!clean || !TRACK_PATH.test(clean)) return done;
    const campaignClean = campaign
      ?.toLowerCase()
      .replace(/[^a-z0-9 _.+-]/g, '')
      .slice(0, 40);
    await recordEvent({
      type: 'view',
      path: clean,
      ...(entry ? { entry: true } : {}),
      ...(entry && hostOf(ref) ? { ref: hostOf(ref) } : {}),
      ...(entry && campaignClean ? { campaign: campaignClean } : {}),
    });
  } else if (productId) {
    await recordEvent({ type: 'product', productId });
  }
  return done;
}
