/** Inventory shapes and cross-service event contracts (docs/MASTER_PLAN.md §3). */

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const ADJUSTMENT_REASONS = ['RECEIVED', 'RETURNED', 'DAMAGED', 'CORRECTION'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
/** Reasons written by the system (order flow), never chosen by staff. */
export type SystemReason = 'SALE' | 'ORDER_CANCELLED';

export type StockStatus = 'in' | 'low' | 'out';

export interface StockItem {
  variantId: string;
  productId: string;
  productName: string;
  productStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  sku: string;
  /** e.g. "Ruby · 30 ml" (empty for single-variant products). */
  label: string;
  onHand: number;
  /** null = store default (DEFAULT_LOW_STOCK_THRESHOLD). */
  lowStockThreshold: number | null;
  /** The variant was removed from the catalog; kept for history, hidden from stock lists. */
  removed?: boolean;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  at: string;
  variantId: string;
  sku: string;
  delta: number;
  onHandAfter: number;
  reason: AdjustmentReason | SystemReason;
  note?: string;
  /** Admin sub, or "order:<orderId>" for system movements. */
  actor: string;
  /** Admin display name at the time of the change. */
  actorName?: string;
}

/** Public availability for a product page. Counts are only revealed when stock is low. */
export interface VariantAvailability {
  status: StockStatus;
  count?: number;
}

export interface OrderLineQty {
  variantId: string;
  qty: number;
}

// ── Events (EventBridge detail-type → detail) ────────────────────────────────

export const EVENT_SOURCES = {
  catalog: 'aussie.catalog',
  inventory: 'aussie.inventory',
  delivery: 'aussie.delivery',
  orders: 'aussie.orders',
  reviews: 'aussie.reviews',
} as const;

export interface VariantsChangedDetail {
  productId: string;
  productName: string;
  productStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  variants: { id: string; sku: string; label: string }[];
  removedVariantIds: string[];
  /** The whole product was deleted. */
  deleted?: boolean;
}

export interface StockChangedDetail {
  productId: string;
  variantId: string;
  /** On hand after the change (never negative). */
  onHand: number;
}

export const EVENTS = {
  variantsChanged: 'catalog.VariantsChanged',
  stockChanged: 'inventory.StockChanged',
  ratesChanged: 'delivery.RatesChanged',
  orderPlaced: 'orders.OrderPlaced',
  orderStatusChanged: 'orders.OrderStatusChanged',
  orderPaymentReminder: 'orders.PaymentReminder',
  ratingChanged: 'reviews.RatingChanged',
} as const;
