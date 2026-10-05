import 'server-only';
import type { VariantAvailability } from '@aussie/shared-types';
import { API_URL } from './api';

/** Storefront availability reads carry this tag; admin stock changes call updateTag(INVENTORY_TAG). */
export const INVENTORY_TAG = 'inventory';

/**
 * Per-variant availability for a product page. Cached briefly (stock moves faster than the
 * catalog). Failure degrades to "unknown" rather than breaking the page.
 */
export async function getAvailability(
  productId: string,
  options: { fresh?: boolean } = {},
): Promise<Record<string, VariantAvailability> | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(
      `${API_URL}/v1/inventory/availability?productId=${encodeURIComponent(productId)}`,
      {
        ...(options.fresh
          ? { cache: 'no-store' as const }
          : { next: { revalidate: 30, tags: [INVENTORY_TAG] } }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) return null;
    return ((await res.json()) as { variants: Record<string, VariantAvailability> }).variants;
  } catch {
    return null;
  }
}

export { availabilityLabel, availableUnits } from './stock-label';
