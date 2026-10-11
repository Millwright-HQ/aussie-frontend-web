import 'server-only';
import { api } from './api';
import { lookupBag } from './orders';

/** A checkout that is open right now: stock taken, order not placed. No customer is known. */
export interface OpenHold {
  holdId: string;
  createdAt: string;
  expiresAt: string;
  lines: { variantId: string; productId: string; name: string; label: string; qty: number }[];
}

/**
 * Open checkouts with product names, for the admin. Never throws: this is a side indicator, so
 * if it can't be read the page simply shows none.
 */
export async function listOpenHolds(): Promise<OpenHold[]> {
  try {
    const { holds } = await api<{
      holds: {
        holdId: string;
        createdAt: string;
        expiresAt: string;
        lines: { productId: string; variantId: string; qty: number }[];
      }[];
    }>('admin', '/v1/orders/admin/holds');
    if (holds.length === 0) return [];
    const snapshots = await lookupBag(holds.flatMap((h) => h.lines));
    const byVariant = new Map(snapshots.map((s) => [s.variantId, s]));
    return holds.map((h) => ({
      ...h,
      lines: h.lines.map((l) => {
        const s = byVariant.get(l.variantId);
        return {
          ...l,
          name: s?.productName ?? 'Unknown product',
          label: s?.label ?? '',
        };
      }),
    }));
  } catch {
    return [];
  }
}

/** Units held by open checkouts, per variant. */
export function heldByVariant(holds: OpenHold[]): Map<string, number> {
  const held = new Map<string, number>();
  for (const h of holds)
    for (const l of h.lines) held.set(l.variantId, (held.get(l.variantId) ?? 0) + l.qty);
  return held;
}
