import 'server-only';
import type { DeliveryQuote } from '@aussie/shared-types';
import type { QuoteRequest } from '@aussie/validation';
import { API_URL } from './api';

export const DELIVERY_TAG = 'delivery';

export interface DistrictOption {
  code: string;
  name: string;
  province: string;
  /** Fixed price (cents), when delivery is priced per district. */
  feeCents?: number;
}

/** District list for the delivery-fee checker (cached; changes only with the seed). */
export async function getDistricts(): Promise<DistrictOption[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/v1/delivery/districts`, {
      next: { revalidate: 300, tags: [DELIVERY_TAG] },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    return ((await res.json()) as { items: DistrictOption[] }).items;
  } catch {
    return [];
  }
}

export type QuoteResult = { ok: true; quote: DeliveryQuote } | { ok: false; message: string };

/** Fee quote. Refusals (too heavy, no rates) carry a message that is safe to show shoppers. */
export async function getQuote(req: QuoteRequest): Promise<QuoteResult> {
  try {
    const res = await fetch(`${API_URL}/v1/delivery/quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) return { ok: true, quote: (await res.json()) as DeliveryQuote };
    if (res.status === 422) {
      const problem = (await res.json()) as { detail?: string };
      return { ok: false, message: problem.detail ?? 'Delivery is not available for this order.' };
    }
  } catch {
    // fall through to the generic message
  }
  return { ok: false, message: 'Could not work out the delivery fee. Please try again.' };
}

const rs = (cents: number) =>
  `Rs ${(cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One-line summary shown to shoppers. */
export function describeQuote(q: DeliveryQuote): string {
  const parts: string[] = [];
  if (q.freeDelivery) parts.push('Free delivery');
  else parts.push(`Delivery ${rs(q.deliveryFeeCents)}`);
  if (q.codFeeCents > 0) {
    parts.push(
      q.showCodFeeSeparately
        ? `COD fee ${rs(q.codFeeCents)}`
        : `(includes ${rs(q.codFeeCents)} COD fee)`,
    );
  }
  if (q.estimatedDays) {
    const { min, max } = q.estimatedDays;
    parts.push(`about ${min === max ? `${min}` : `${min}–${max}`} day${max === 1 ? '' : 's'}`);
  }
  return parts.join(' · ');
}
