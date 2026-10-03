import type { OrderStatus, PaymentMethod, PaymentStatus } from '@aussie/shared-types';

/** Shopper-facing words for order statuses (pure; used by the storefront and the admin board). */
export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Order received';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PACKED':
      return 'Packed';
    case 'SHIPPED':
      return 'On the way';
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'RETURNED':
      return 'Returned';
  }
}

/** One-line explanation of what happens next, for the shopper. */
export function statusHint(status: OrderStatus, method: PaymentMethod = 'COD'): string {
  switch (status) {
    case 'PENDING':
      return method === 'BANK_TRANSFER'
        ? 'Pay by bank transfer and upload your payment slip. We confirm your order once we have checked it.'
        : 'We will call you shortly to confirm your order.';
    case 'CONFIRMED':
      return 'Your order is confirmed and will be packed soon.';
    case 'PACKED':
      return 'Your order is packed and waiting for the courier.';
    case 'SHIPPED':
      return method === 'BANK_TRANSFER'
        ? 'Your parcel is with the courier.'
        : 'Your parcel is with the courier. Keep the cash ready for delivery.';
    case 'OUT_FOR_DELIVERY':
      return method === 'BANK_TRANSFER'
        ? 'Your parcel is out for delivery today.'
        : 'Your parcel is out for delivery today. Please keep the cash ready.';
    case 'DELIVERED':
      return 'Delivered. Thank you for shopping with us!';
    case 'CANCELLED':
      return 'This order was cancelled.';
    case 'RETURNED':
      return 'This order was returned to us.';
  }
}

/** Staff-facing words for where a bank transfer stands. */
export function paymentStatusLabel(status: PaymentStatus | undefined): string {
  switch (status) {
    case 'AWAITING_PROOF':
      return 'Awaiting payment slip';
    case 'PROOF_SUBMITTED':
      return 'Slip uploaded: needs review';
    case 'CONFIRMED':
      return 'Payment confirmed';
    case 'REJECTED':
      return 'Slip rejected';
    case 'REFUND_DUE':
      return 'Refund due to the customer';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return 'Cash on delivery';
  }
}

/** Tailwind classes for a status badge (fixed strings so Tailwind can see them). */
export function statusTone(status: OrderStatus): string {
  switch (status) {
    case 'DELIVERED':
      return 'bg-success/15 text-success';
    case 'CANCELLED':
    case 'RETURNED':
      return 'bg-danger/15 text-danger';
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'bg-warning/15 text-warning';
    default:
      return 'bg-surface-muted text-text';
  }
}

export const formatOrderDate = (iso: string) =>
  new Date(iso).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** The stages of a normal delivery, in order. */
export const TIMELINE_STAGES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  /** done: reached · current: where the order is now · todo: still to come */
  state: 'done' | 'current' | 'todo';
  at?: string;
  /** A message staff chose to show the customer with this step. */
  note?: string;
}

/**
 * What the customer sees as "where is my order": every stage from received to delivered, with the
 * time it was reached and any message from the store. A cancelled or returned order stops at the
 * stage it reached and ends with that outcome.
 */
export function buildTimeline(order: {
  status: OrderStatus;
  history: { at: string; to: OrderStatus; publicNote?: string }[];
}): TimelineStep[] {
  const reached = new Map<OrderStatus, { at: string; publicNote?: string }>();
  for (const h of order.history) if (!reached.has(h.to)) reached.set(h.to, h);

  const ended = order.status === 'CANCELLED' || order.status === 'RETURNED';
  const furthest = TIMELINE_STAGES.reduce((max, stage, i) => (reached.has(stage) ? i : max), -1);

  const steps: TimelineStep[] = [];
  TIMELINE_STAGES.forEach((status, i) => {
    const hit = reached.get(status);
    // A stage staff skipped (for example straight from shipped to delivered) still counts as passed.
    const passed = Boolean(hit) || i < furthest;
    if (ended && !passed) return;
    steps.push({
      status,
      label: statusLabel(status),
      state: !passed ? 'todo' : status === order.status ? 'current' : 'done',
      ...(hit ? { at: hit.at } : {}),
      ...(hit?.publicNote ? { note: hit.publicNote } : {}),
    });
  });
  if (ended) {
    const hit = reached.get(order.status);
    steps.push({
      status: order.status,
      label: statusLabel(order.status),
      state: 'current',
      ...(hit ? { at: hit.at } : {}),
      ...(hit?.publicNote ? { note: hit.publicNote } : {}),
    });
  }
  return steps;
}
