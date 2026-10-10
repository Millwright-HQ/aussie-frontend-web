/** Inventory shapes and cross-service event contracts (docs/MASTER_PLAN.md §3). */

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const ADJUSTMENT_REASONS = ['RECEIVED', 'RETURNED', 'DAMAGED', 'CORRECTION'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
/** Reasons written by the system (order flow), never chosen by staff. */
export type SystemReason = 'SALE' | 'ORDER_CANCELLED' | 'HOLD_RELEASED';

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

/** Public availability for a product page. The count is shown whenever something is in stock. */
export interface VariantAvailability {
  status: StockStatus;
  count?: number;
}

/** "Tell me when it is back": a shopper waiting for a sold-out variant. */
export type WaitlistStatus = 'WAITING' | 'NOTIFIED';

export interface WaitlistEntry {
  variantId: string;
  productId: string;
  productName: string;
  /** e.g. "Ruby · 30 ml" (empty for single-variant products). */
  label: string;
  /** Product page slug, so the "it is back" email can link to it. */
  slug: string;
  email: string;
  name?: string;
  phone?: string;
  status: WaitlistStatus;
  createdAt: string;
  notifiedAt?: string;
}

/** Admin view: how many people wait for each variant, to plan the next bulk order. */
export interface WaitlistVariantSummary {
  variantId: string;
  productId: string;
  productName: string;
  label: string;
  sku: string;
  onHand: number;
  waiting: number;
  notified: number;
  latestAt: string;
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
  /**
   * The stock row's version after the change. It only ever goes up, so a consumer that mirrors the
   * level ignores an event older than the one it already applied (EventBridge does not keep order).
   * Absent on events sent before versions existed: those are applied as before.
   */
  version?: number;
}

export const EVENTS = {
  variantsChanged: 'catalog.VariantsChanged',
  stockChanged: 'inventory.StockChanged',
  ratesChanged: 'delivery.RatesChanged',
  orderPlaced: 'orders.OrderPlaced',
  orderStatusChanged: 'orders.OrderStatusChanged',
  orderPaymentReminder: 'orders.PaymentReminder',
  orderPaymentRejected: 'orders.PaymentRejected',
  ratingChanged: 'reviews.RatingChanged',
} as const;
