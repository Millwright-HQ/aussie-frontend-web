/** Order shapes and cross-service event contracts (docs/MASTER_PLAN.md §3-4). Money in cents. */

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** How the customer pays. Bank transfer orders wait for the customer's proof and an admin's OK. */
export const PAYMENT_METHODS = ['COD', 'BANK_TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Bank transfer progress (COD orders have none): AWAITING_PROOF → PROOF_SUBMITTED → CONFIRMED.
 * An admin may instead REJECT a proof, which lets the customer upload a new one. When a paid
 * order is cancelled or returned the money is owed back: REFUND_DUE until staff mark it REFUNDED.
 */
export const PAYMENT_STATUSES = [
  'AWAITING_PROOF',
  'PROOF_SUBMITTED',
  'CONFIRMED',
  'REJECTED',
  'REFUND_DUE',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Orders placed before bank transfer existed have no `paymentMethod`: they were all COD. */
export const paymentMethodOf = (order: { paymentMethod?: PaymentMethod }): PaymentMethod =>
  order.paymentMethod ?? 'COD';

/** The store's bank account: edited by an admin, shown to customers who pay by transfer. */
export interface BankDetails {
  accountName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  /** Free text, e.g. "Use your order number as the payment reference". */
  instructions?: string;
  updatedAt?: string;
}

/** Allowed next statuses (docs/MASTER_PLAN.md §3.1). Every transition is validated server-side. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

/** Statuses that still need work from staff. */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
];

/** The statuses an order in `from` may move to. */
export const nextStatuses = (from: OrderStatus): readonly OrderStatus[] =>
  Object.entries(ORDER_TRANSITIONS).find(([status]) => status === from)?.[1] ?? [];

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  nextStatuses(from).includes(to);

/** A line as it was when the order was placed: later catalog edits never change it. */
export interface OrderLine {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  sku: string;
  /** "Ruby · 30 ml"; empty without options. */
  label: string;
  imageBase?: string;
  qty: number;
  unitPriceCents: number;
  weightG: number;
  lineTotalCents: number;
}

export interface OrderShipping {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode?: string;
  notes?: string;
}

export interface Order {
  id: string;
  /** Human-friendly, e.g. AC-26-00042. */
  orderNumber: string;
  status: OrderStatus;
  /** Signed-in customer who placed it (absent for guests). */
  customerSub?: string;
  email?: string;
  shipping: OrderShipping;
  /** What the customer asked for at checkout (gift wrap, call first…). */
  instructions?: string;
  lines: OrderLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  codFeeCents: number;
  totalCents: number;
  chargeableWeightG: number;
  zoneName: string;
  /** Delivery estimate shown at checkout (days). */
  estimatedDays?: { min: number; max: number };
  courier?: string;
  trackingNo?: string;
  codCollectedCents?: number;
  /** Absent on orders placed before bank transfer existed (= COD). */
  paymentMethod?: PaymentMethod;
  /** Bank transfer only. */
  paymentStatus?: PaymentStatus;
  /** S3 key of the uploaded slip. Private: shoppers only see `paymentProofUploaded`. */
  paymentProofKey?: string;
  paymentProofAt?: string;
  /** Why a proof was rejected (shown to the customer). */
  paymentNote?: string;
  paymentConfirmedAt?: string;
  /** When the last slip was rejected: the payment window restarts from here. */
  paymentRejectedAt?: string;
  /** Set once the "please pay" reminder went out (one reminder per order). */
  paymentReminderAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderHistoryEntry {
  at: string;
  from?: OrderStatus;
  to: OrderStatus;
  /** Admin sub, "customer" or "guest". */
  actor: string;
  actorName?: string;
  /** Internal: for staff only. */
  note?: string;
  /** Shown to the customer on their order timeline. */
  publicNote?: string;
}

/** What a guest (order number + phone) or a customer sees about an order. */
export interface OrderView extends Omit<Order, 'customerSub' | 'paymentProofKey'> {
  paymentProofUploaded: boolean;
  history: Pick<OrderHistoryEntry, 'at' | 'to' | 'publicNote'>[];
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface OrderPlacedDetail {
  orderId: string;
  orderNumber: string;
  customerSub?: string;
  name: string;
  phone: string;
  email?: string;
  totalCents: number;
  paymentMethod?: PaymentMethod;
  itemCount: number;
  lines: { productName: string; label: string; qty: number }[];
}

export interface OrderStatusChangedDetail {
  orderId: string;
  orderNumber: string;
  from: OrderStatus;
  to: OrderStatus;
  customerSub?: string;
  name: string;
  phone: string;
  email?: string;
  courier?: string;
  trackingNo?: string;
  totalCents: number;
  paymentMethod?: PaymentMethod;
  /** The note staff chose to show the customer with this step. */
  customerNote?: string;
  /** For reviews: which products a DELIVERED order makes reviewable. */
  products: { productId: string; productName: string; slug: string }[];
}

/** "Please pay": sent once to a bank-transfer customer whose slip is still missing. */
export interface OrderPaymentReminderDetail {
  orderId: string;
  orderNumber: string;
  name: string;
  phone: string;
  email?: string;
  totalCents: number;
  /** Roughly how long until the order is cancelled automatically. */
  hoursLeft: number;
}

/** Numbers for the admin dashboard. "Today" is the Sri Lanka calendar day (UTC+5:30). */
export interface OrdersSummary {
  counts: Record<OrderStatus, number>;
  today: {
    /** Orders placed today, whatever their status now. */
    placed: number;
    /** Value of today's orders that were not cancelled or returned. */
    valueCents: number;
  };
  /** Shipped COD orders: cash the courier still has to bring back. */
  awaitingCash: { count: number; valueCents: number };
}

/** Sales analytics for a window of days ending now (Sri Lanka calendar days). */
export interface OrdersAnalytics {
  days: number;
  /** First and last calendar day of the window, YYYY-MM-DD. */
  from: string;
  to: string;
  /** One entry per day, oldest first, including days with no orders. */
  series: { date: string; orders: number; revenueCents: number }[];
  totals: {
    orders: number;
    /** Value of orders that were not cancelled or returned. */
    revenueCents: number;
    averageOrderCents: number;
    delivered: number;
    cancelled: number;
    returned: number;
    /** Share of orders cancelled or returned, 0..1. */
    lossRate: number;
    /** Average days from placing to delivery (delivered orders only; null when none). */
    avgDeliveryDays: number | null;
  };
  /** The window of the same length just before, to show change. */
  previous: { orders: number; revenueCents: number };
  byStatus: Record<OrderStatus, number>;
  byPayment: Record<PaymentMethod, { orders: number; revenueCents: number }>;
  topProducts: { productId: string; name: string; units: number; revenueCents: number }[];
  topDistricts: { district: string; orders: number; revenueCents: number }[];
  customers: { signedIn: number; guests: number };
  /** Work waiting for a person right now (not limited to the window). */
  attention: {
    awaitingConfirmation: number;
    transferProofsToReview: number;
    refundsDue: number;
    toShip: number;
  };
}

/** A bank-transfer slip was turned down: the customer is told why and can upload another. */
export interface OrderPaymentRejectedDetail {
  orderId: string;
  orderNumber: string;
  name: string;
  phone: string;
  email?: string;
  totalCents: number;
  reason: string;
}

/** Hold on the stock while a customer is in the checkout (owner decision 2026-10-05). */
export const CHECKOUT_HOLD_MINUTES = 30;

export interface CheckoutHold {
  /** Becomes the order's id when the order is completed. */
  holdId: string;
  /** When the held stock goes back on sale if the order is not completed. */
  expiresAt: string;
  lines: { variantId: string; qty: number }[];
}

export interface CheckoutShortage {
  variantId: string;
  requested: number;
  available: number;
}

/** Answer to "hold this bag": held, or what is short (the previous hold, if any, is kept). */
export type CheckoutHoldResult =
  | ({ ok: true } & CheckoutHold)
  | { ok: false; shortages: CheckoutShortage[]; hold?: CheckoutHold; message?: string };
