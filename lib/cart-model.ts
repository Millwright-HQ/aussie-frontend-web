import { MAX_ORDER_LINES, MAX_QTY_PER_LINE } from '@aussie/validation';

export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
}

/** Adds to the bag, merging with an existing line (capped per line). Returns false when the bag is full. */
export function withLine(lines: CartLine[], add: CartLine): CartLine[] | null {
  const existing = lines.find((l) => l.variantId === add.variantId);
  if (existing) {
    return lines.map((l) =>
      l.variantId === add.variantId
        ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + add.qty) }
        : l,
    );
  }
  return lines.length >= MAX_ORDER_LINES
    ? null
    : [...lines, { ...add, qty: Math.min(MAX_QTY_PER_LINE, add.qty) }];
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
