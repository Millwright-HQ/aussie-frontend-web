import {
  nextStatuses,
  type Order,
  paymentMethodOf,
  type OrderHistoryEntry,
  type OrderStatus,
} from '@aussie/shared-types';
import { Card, Field, Input, formatLkr } from '@aussie/ui';
import { DISTRICTS, ulidSchema } from '@aussie/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { getSite } from '@/lib/content';
import { paymentStatusLabel, statusLabel, statusTone } from '@/lib/order-format';
import { ActionForm } from '../../action-form';
import { ContactButtons, NoteForm, RefundForm, ShippingForm } from './extras';
import { changeStatusAction, decidePaymentAction } from '../actions';

export const metadata = { title: 'Order' };

type AdminOrder = Order & { history: OrderHistoryEntry[] };

/** Button label for moving to a status. */
function stepLabel(to: OrderStatus): string {
  switch (to) {
    case 'CONFIRMED':
      return 'Confirm order (customer phoned)';
    case 'PACKED':
      return 'Mark as packed';
    case 'SHIPPED':
      return 'Hand to courier';
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery today';
    case 'DELIVERED':
      return 'Mark delivered (cash collected)';
    case 'CANCELLED':
      return 'Cancel order';
    case 'RETURNED':
      return 'Mark returned';
    case 'PENDING':
      return 'Back to pending';
  }
}

/** Bank transfers: look at the slip, then confirm the payment or send it back. */
function PaymentCard({ order, canDecide }: { order: AdminOrder; canDecide: boolean }) {
  const waiting = order.status === 'PENDING' && order.paymentStatus === 'PROOF_SUBMITTED';
  return (
    <Card>
      <h2 className="text-h3">Payment</h2>
      <p className="mt-3 text-sm">
        Bank transfer ·{' '}
        <span className="font-medium">{paymentStatusLabel(order.paymentStatus)}</span>
      </p>
      {order.paymentProofAt && (
        <p className="mt-1 text-sm text-muted">
          Slip uploaded {formatDateTime(order.paymentProofAt)}
        </p>
      )}
      {order.paymentStatus === 'REJECTED' && order.paymentNote && (
        <p className="mt-1 text-sm text-muted">Reason given: “{order.paymentNote}”</p>
      )}
      {order.paymentProofKey && (
        <p className="mt-3">
          <a
            href={`/admin/orders/${order.id}/slip`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            View payment slip ↗
          </a>
        </p>
      )}
      {waiting &&
        (canDecide ? (
          <div className="mt-4 space-y-6">
            <p className="text-sm">
              Check the slip shows{' '}
              <span className="font-medium">{formatLkr(order.totalCents)}</span> paid to your
              account, then confirm.
            </p>
            <ActionForm
              action={decidePaymentAction.bind(null, order.id, 'confirm')}
              submitLabel="Payment received: confirm order"
              size="sm"
            />
            <div className="border-t border-border pt-4">
              <ActionForm
                action={decidePaymentAction.bind(null, order.id, 'reject')}
                submitLabel="Reject slip"
                variant="danger"
                size="sm"
              >
                <Field
                  id="reject-note"
                  label="Reason for the customer"
                  hint="They see this and can upload a new slip"
                >
                  <Input id="reject-note" name="note" required maxLength={300} hasHint />
                </Field>
              </ActionForm>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Your role cannot confirm bank transfers (needs “Confirm bank transfer payments”).
          </p>
        ))}
      {order.paymentStatus === 'REFUND_DUE' &&
        (canDecide ? (
          <div className="mt-4">
            <RefundForm orderId={order.id} totalCents={order.totalCents} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            A refund is due. Someone with “Confirm bank transfer payments” records it once paid.
          </p>
        ))}
      {order.refundedAt && (
        <p className="mt-1 text-sm text-muted">Refunded {formatDateTime(order.refundedAt)}</p>
      )}
      {order.status === 'PENDING' && order.paymentStatus === 'AWAITING_PROOF' && (
        <p className="mt-3 text-sm text-muted">
          Waiting for the customer to upload their slip. Call them on {order.shipping.phone} if it
          takes long, or cancel the order to release the stock.
        </p>
      )}
    </Card>
  );
}

function StepForm({ order, to, canCod }: { order: AdminOrder; to: OrderStatus; canCod: boolean }) {
  const byTransfer = paymentMethodOf(order) === 'BANK_TRANSFER';
  if (to === 'CONFIRMED' && byTransfer && order.paymentStatus !== 'CONFIRMED') {
    return (
      <p className="text-sm text-muted">
        Paid by bank transfer: the order is confirmed when you approve the customer’s payment slip
        (see Payment).
      </p>
    );
  }
  if (to === 'DELIVERED' && !canCod) {
    return (
      <p className="text-sm text-muted">
        Marking delivered records the cash collected and needs the “Record COD collected”
        permission.
      </p>
    );
  }
  const danger = to === 'CANCELLED' || to === 'RETURNED';
  return (
    <ActionForm
      action={changeStatusAction.bind(null, order.id, to)}
      submitLabel={stepLabel(to)}
      variant={danger ? 'danger' : 'primary'}
      size="sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {to === 'SHIPPED' && (
          <>
            <Field id={`courier-${to}`} label="Courier">
              <Input id={`courier-${to}`} name="courier" required maxLength={60} />
            </Field>
            <Field id={`track-${to}`} label="Tracking number">
              <Input id={`track-${to}`} name="trackingNo" required maxLength={60} />
            </Field>
          </>
        )}
        {to === 'DELIVERED' && !byTransfer && (
          <Field
            id="cod"
            label="Cash collected (Rs)"
            hint="The order total unless the customer paid a different amount"
          >
            <Input
              id="cod"
              name="codCollected"
              inputMode="decimal"
              defaultValue={(order.totalCents / 100).toFixed(2)}
              hasHint
            />
          </Field>
        )}
        {to === 'RETURNED' && (
          <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="restock" className="size-4 accent-primary" />
            Goods are fine to resell: put them back in stock
          </label>
        )}
        <Field
          id={`cnote-${to}`}
          label="Message for the customer"
          hint="Shown on their order page and in the email, for example “Arriving this afternoon”"
          optional
          className="sm:col-span-2"
        >
          <Input id={`cnote-${to}`} name="customerNote" maxLength={200} hasHint />
        </Field>
        <Field
          id={`note-${to}`}
          label="Staff note"
          hint="Only staff see this"
          optional
          className="sm:col-span-2"
        >
          <Input id={`note-${to}`} name="note" maxLength={300} hasHint />
        </Field>
      </div>
    </ActionForm>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission('order:read');
  const { id } = await params;
  if (!ulidSchema.safeParse(id).success) notFound();
  const order = await api<AdminOrder>('admin', `/v1/orders/admin/orders/${id}`).catch(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    },
  );
  if (!order) notFound();
  const next = nextStatuses(order.status);
  const canAct = can(me, 'order:update-status');
  const storeName = (await getSite()).settings.storeName;
  const canEditShipping = canAct && ['PENDING', 'CONFIRMED', 'PACKED'].includes(order.status);
  const district =
    DISTRICTS.find((d) => d.code === order.shipping.district)?.name ?? order.shipping.district;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted hover:text-text">
            ← Orders
          </Link>
          <h1 className="mt-2 text-h1 tabular">{order.orderNumber}</h1>
          <p className="text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
          <Link
            href={`/admin/orders/${order.id}/print`}
            target="_blank"
            className="text-sm font-medium text-primary hover:underline"
          >
            Packing slip ↗
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-h3">Items</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Price</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.variantId} className="border-b border-border">
                    <td className="py-2">
                      {l.productName}
                      {l.label && <span className="text-muted"> · {l.label}</span>}
                      <span className="block font-mono text-xs text-muted">{l.sku}</span>
                    </td>
                    <td className="py-2 text-right tabular">{l.qty}</td>
                    <td className="py-2 text-right tabular">{formatLkr(l.unitPriceCents)}</td>
                    <td className="py-2 text-right tabular">{formatLkr(l.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatLkr(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery ({order.zoneName})</dt>
                <dd className="tabular">{formatLkr(order.deliveryFeeCents)}</dd>
              </div>
              {order.codFeeCents > 0 && (
                <div className="flex justify-between">
                  <dt>COD fee</dt>
                  <dd className="tabular">{formatLkr(order.codFeeCents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                <dt>
                  {paymentMethodOf(order) === 'BANK_TRANSFER'
                    ? 'Total (bank transfer)'
                    : 'Total to collect'}
                </dt>
                <dd className="tabular">{formatLkr(order.totalCents)}</dd>
              </div>
              {order.codCollectedCents !== undefined && (
                <div className="flex justify-between text-success">
                  <dt>Cash collected</dt>
                  <dd className="tabular">{formatLkr(order.codCollectedCents)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-muted">
              Parcel weight charged: {order.chargeableWeightG} g
            </p>
          </Card>

          <Card>
            <h2 className="text-h3">History</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {[...order.history].reverse().map((h) => (
                <li key={`${h.at}-${h.to}`}>
                  <span className="font-medium">{statusLabel(h.to)}</span>{' '}
                  <span className="text-muted">
                    {formatDateTime(h.at)} ·{' '}
                    {h.actor === 'customer'
                      ? 'Customer'
                      : h.actor === 'guest'
                        ? 'Customer (guest)'
                        : (h.actorName ?? 'Admin')}
                  </span>
                  {h.note && <span className="block text-muted">“{h.note}”</span>}
                  {h.publicNote && (
                    <span className="block text-muted">Shown to customer: “{h.publicNote}”</span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-h3">Customer</h2>
            <p className="mt-3 font-medium">{order.shipping.fullName}</p>
            <p className="text-sm">
              <a href={`tel:${order.shipping.phone}`} className="text-primary hover:underline">
                {order.shipping.phone}
              </a>
            </p>
            {order.email && <p className="text-sm text-muted">{order.email}</p>}
            <ContactButtons order={order} storeName={storeName} />
            <p className="mt-3 text-sm text-muted">
              {order.shipping.line1}
              {order.shipping.line2 ? `, ${order.shipping.line2}` : ''}, {order.shipping.city},{' '}
              {district}
              {order.shipping.postalCode ? ` ${order.shipping.postalCode}` : ''}
            </p>
            {order.shipping.notes && <p className="mt-2 text-sm">Note: {order.shipping.notes}</p>}
            {order.courier && (
              <p className="mt-3 text-sm">
                Courier: <span className="font-medium">{order.courier}</span> · {order.trackingNo}
              </p>
            )}
            {canEditShipping && <ShippingForm order={order} />}
          </Card>

          {canAct && (
            <Card>
              <h2 className="text-h3">Add a note</h2>
              <div className="mt-3">
                <NoteForm orderId={order.id} />
              </div>
            </Card>
          )}

          {paymentMethodOf(order) === 'BANK_TRANSFER' && (
            <PaymentCard order={order} canDecide={can(me, 'order:payment')} />
          )}

          {next.length > 0 && (
            <Card>
              <h2 className="text-h3">Next step</h2>
              {canAct ? (
                <div className="mt-4 space-y-6">
                  {next.map((to) => (
                    <div
                      key={to}
                      className={
                        to === 'CANCELLED' || to === 'RETURNED'
                          ? 'border-t border-border pt-4'
                          : undefined
                      }
                    >
                      <StepForm order={order} to={to} canCod={can(me, 'order:cod')} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Your role can view orders but not change them.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
