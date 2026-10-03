import type { OrderView } from '@aussie/shared-types';
import { formatLkr } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import Image from 'next/image';
import { imageUrl } from '@/lib/media';
import {
  buildTimeline,
  formatOrderDate,
  statusHint,
  statusLabel,
  statusTone,
} from '@/lib/order-format';
import { PaymentPanel } from './payment-panel';

/** What a shopper sees about an order: status and timeline, items, totals and where it is going. */
export function OrderSummary({ order }: { order: OrderView }) {
  const district =
    DISTRICTS.find((d) => d.code === order.shipping.district)?.name ?? order.shipping.district;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Order number</p>
          <p className="text-h2 tabular">{order.orderNumber}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>
      <p className="text-sm text-muted">{statusHint(order.status, order.paymentMethod)}</p>
      <PaymentPanel order={order} />

      {order.status === 'SHIPPED' && order.courier && (
        <p className="rounded-sm border border-border bg-surface p-3 text-sm">
          Courier: <span className="font-medium">{order.courier}</span>
          {order.trackingNo && (
            <>
              {' '}
              · Tracking no. <span className="font-medium">{order.trackingNo}</span>
            </>
          )}
        </p>
      )}

      <ol aria-label="Order progress" className="space-y-0 text-sm">
        {buildTimeline(order).map((step, i, all) => (
          <li
            key={step.status}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {i < all.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-5 bottom-0 left-[9px] w-px ${
                  step.state === 'todo' ? 'bg-border' : 'bg-primary'
                }`}
              />
            )}
            <span
              aria-hidden
              className={`relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                step.state === 'todo'
                  ? 'border-border bg-surface'
                  : step.state === 'current'
                    ? step.status === 'CANCELLED' || step.status === 'RETURNED'
                      ? 'border-danger bg-danger'
                      : 'border-primary bg-surface'
                    : 'border-primary bg-primary'
              }`}
            >
              {step.state === 'current' &&
                step.status !== 'CANCELLED' &&
                step.status !== 'RETURNED' && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span>
              <span className={step.state === 'todo' ? 'text-muted' : 'font-medium'}>
                {step.label}
              </span>
              {step.state === 'todo' && <span className="sr-only"> (not yet)</span>}
              {step.at && <span className="block text-muted">{formatOrderDate(step.at)}</span>}
              {step.note && (
                <span className="mt-1 block rounded-sm bg-surface-muted px-3 py-2">
                  {step.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <ul className="divide-y divide-border border-y border-border">
        {order.lines.map((l) => (
          <li key={l.variantId} className="flex gap-4 py-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
              {l.imageBase && (
                <Image
                  src={imageUrl(l.imageBase)}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{l.productName}</p>
              {l.label && <p className="text-muted">{l.label}</p>}
              <p className="text-muted">
                {l.qty} × {formatLkr(l.unitPriceCents)}
              </p>
            </div>
            <p className="text-sm font-medium tabular">{formatLkr(l.lineTotalCents)}</p>
          </li>
        ))}
      </ul>

      <dl className="ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular">{formatLkr(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className="tabular">
            {order.deliveryFeeCents === 0 ? 'Free' : formatLkr(order.deliveryFeeCents)}
          </dd>
        </div>
        {order.codFeeCents > 0 && (
          <div className="flex justify-between">
            <dt>Cash on delivery fee</dt>
            <dd className="tabular">{formatLkr(order.codFeeCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
          <dt>
            {order.paymentMethod === 'BANK_TRANSFER'
              ? order.paymentStatus === 'CONFIRMED'
                ? 'Total paid by bank transfer'
                : 'Total to pay by bank transfer'
              : order.status === 'DELIVERED'
                ? 'Total paid in cash'
                : 'Total to pay in cash'}
          </dt>
          <dd className="tabular">{formatLkr(order.totalCents)}</dd>
        </div>
      </dl>

      <div className="text-sm">
        <p className="font-medium">Delivering to</p>
        <p className="text-muted">
          {order.shipping.fullName}, {order.shipping.line1}
          {order.shipping.line2 ? `, ${order.shipping.line2}` : ''}, {order.shipping.city},{' '}
          {district}
        </p>
        {order.estimatedDays && (
          <p className="mt-1 text-muted">
            Estimated delivery:{' '}
            {order.estimatedDays.min === order.estimatedDays.max
              ? order.estimatedDays.min
              : `${order.estimatedDays.min}–${order.estimatedDays.max}`}{' '}
            days after confirmation
          </p>
        )}
      </div>
    </div>
  );
}
