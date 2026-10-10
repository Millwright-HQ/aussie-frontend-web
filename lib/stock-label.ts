import type { VariantAvailability } from '@aussie/shared-types';

/** Shopper-facing text: counts are never shown; only sold out and the last unit get a message. */
export function availabilityLabel(a: VariantAvailability | undefined): string {
  if (!a) return '';
  if (a.status === 'out') return 'Sold out';
  return a.count === 1 ? 'Last one in stock: order soon' : '';
}

/** Most a shopper may buy of a variant right now: what is in stock (undefined = unknown). */
export const availableUnits = (a: VariantAvailability | undefined): number | undefined =>
  a ? (a.status === 'out' ? 0 : a.count) : undefined;
