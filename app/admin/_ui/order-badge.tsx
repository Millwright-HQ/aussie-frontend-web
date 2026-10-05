import type { OrderStatus, PaymentStatus } from '@aussie/shared-types';
import { paymentStatusLabel, statusLabel } from '@/lib/order-format';
import { Badge, type BadgeTone } from './kit';

const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
};

export const orderStatusTone = (s: OrderStatus): BadgeTone =>
  Object.entries(ORDER_TONE).find(([k]) => k === s)?.[1] ?? 'neutral';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderStatusTone(status)}>{statusLabel(status)}</Badge>;
}

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  AWAITING_PROOF: 'warning',
  PROOF_SUBMITTED: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  REFUND_DUE: 'danger',
  REFUNDED: 'neutral',
};

export function PaymentBadge({ status }: { status: PaymentStatus | undefined }) {
  const tone: BadgeTone = status
    ? (Object.entries(PAYMENT_TONE).find(([k]) => k === status)?.[1] ?? 'neutral')
    : 'neutral';
  return <Badge tone={tone}>{paymentStatusLabel(status)}</Badge>;
}
