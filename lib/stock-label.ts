import type { VariantAvailability } from '@aussie/shared-types';

/** Shopper-facing text for an availability status, with a little urgency when stock is low. */
export function availabilityLabel(a: VariantAvailability | undefined): string {
  if (!a) return '';
  if (a.status === 'out') return 'Sold out';
  const n = a.count;
  if (n === 1) return 'Last one in stock: order soon';
  if (a.status === 'low') return n ? `Only ${n} in stock: order soon` : 'Low stock';
  return n ? `${n} in stock` : 'In stock';
}

/** Most a shopper may buy of a variant right now: what is in stock (undefined = unknown). */
export const availableUnits = (a: VariantAvailability | undefined): number | undefined =>
  a ? (a.status === 'out' ? 0 : a.count) : undefined;
