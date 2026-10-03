import 'server-only';
import type { BankDetails, OrderView, VariantSnapshot } from '@aussie/shared-types';
import type { ProblemDetails } from '@aussie/shared-types';
import { API_URL } from './api';
import type { CartLine } from './cart';

/** A public (no sign-in) call to the API. Never throws for HTTP errors: returns the message to show. */
export type PublicResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

export async function publicPost<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<PublicResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(28_000),
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (res.ok) return { ok: true, data: data as T };
    const problem = (data ?? {}) as Partial<ProblemDetails>;
    const message = (
      problem.errors?.[0]?.message ??
      problem.detail ??
      'Something went wrong. Please try again.'
    ).replace(/^[\w.]+: /, '');
    return { ok: false, status: res.status, message };
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'We could not reach the store right now. Please try again.',
    };
  }
}

/** The store's bank account for customers paying by transfer; null until an admin sets it up. */
export async function getBankDetails(): Promise<Omit<BankDetails, 'updatedAt'> | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/orders/bank-details`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as Omit<BankDetails, 'updatedAt'> | null) : null;
  } catch {
    return null;
  }
}

/** Live prices and availability for the bag (same data checkout uses). */
export async function lookupBag(lines: CartLine[]): Promise<VariantSnapshot[]> {
  if (lines.length === 0) return [];
  const res = await publicPost<{ variants: VariantSnapshot[] }>('/v1/catalog/variants/lookup', {
    items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId })),
  });
  return res.ok ? res.data.variants : [];
}

/** A bag line joined with its live snapshot. */
export interface BagLine extends CartLine {
  snapshot: VariantSnapshot;
}

export async function loadBag(lines: CartLine[]): Promise<BagLine[]> {
  const snapshots = await lookupBag(lines);
  const byVariant = new Map(snapshots.map((s) => [s.variantId, s]));
  return lines.map((l) => ({
    ...l,
    snapshot: byVariant.get(l.variantId) ?? {
      productId: l.productId,
      variantId: l.variantId,
      available: false,
    },
  }));
}

export const bagSubtotal = (lines: BagLine[]) =>
  lines.reduce(
    (sum, l) => sum + (l.snapshot.available ? (l.snapshot.priceCents ?? 0) * l.qty : 0),
    0,
  );

export const bagHasUnavailable = (lines: BagLine[]) => lines.some((l) => !l.snapshot.available);

export type { OrderView };
