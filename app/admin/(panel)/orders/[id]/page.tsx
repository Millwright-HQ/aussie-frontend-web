import {
  nextStatuses,
  type Order,
  type OrderHistoryEntry,
  type OrderStatus,
  paymentMethodOf,
} from '@aussie/shared-types';
import { DISTRICTS, ulidSchema } from '@aussie/validation';
import { Check, ExternalLink, MapPin, Phone, Printer, Truck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { STORE_NAME } from '@/lib/site';
import { buildTimeline, statusLabel } from '@/lib/order-format';
import { ActionForm } from '../../action-form';
import { changeStatusAction, decidePaymentAction } from '../actions';
import {
  Alert,
  Badge,
  buttonVariants,
  cn,
  Field,
  formatLkr,
  Input,
  PageHeader,
  Panel,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { OrderStatusBadge, PaymentBadge } from '@/app/admin/_ui/order-badge';
import { ContactButtons, NoteForm, RefundForm, ShippingForm } from './extras';

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

/** Where the order is on its way to the customer, with the time each stage was reached. */
function Stepper({ order }: { order: AdminOrder }) {
  const steps = buildTimeline(order);
  return (
    <Panel>
      <ol className="flex gap-0 overflow-x-auto pb-1" aria-label="Delivery progress">
        {steps.map((s, i) => {
          const failed = s.status === 'CANCELLED' || s.status === 'RETURNED';
          return (
            <li
              key={`${s.status}-${i}`}
              className="relative flex min-w-[112px] flex-1 flex-col items-center text-center"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[15px] right-1/2 h-0.5 w-full',
                    s.state === 'todo' ? 'bg-border' : failed ? 'bg-danger/50' : 'bg-primary',
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  s.state === 'done' && 'border-primary bg-primary text-primary-fg',
                  s.state === 'current' &&
                    (failed
                      ? 'border-danger bg-danger text-white'
                      : 'border-primary bg-surface text-primary ring-4 ring-primary/15'),
                  s.state === 'todo' && 'border-border bg-surface text-muted',
                )}
              >
                {s.state === 'done' ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn('mt-2 text-[13px] font-medium', s.state === 'todo' && 'text-muted')}
              >
                {s.label}
                {s.state === 'current' && <span className="sr-only"> (current)</span>}
              </span>
              <span className="mt-0.5 min-h-4 text-xs text-muted">
                {s.at ? formatDateTime(s.at) : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Bank transfers: look at the slip, then confirm the payment or send it back. */
function PaymentCard({ order, canDecide }: { order: AdminOrder; canDecide: boolean }) {
  const waiting = order.status === 'PENDING' && order.paymentStatus === 'PROOF_SUBMITTED';
  return (
    <Panel title="Payment" actions={<PaymentBadge status={order.paymentStatus} />}>
      <p className="text-sm text-muted">Bank transfer</p>
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            View payment slip <ExternalLink aria-hidden size={13} />
          </a>
        </p>
      )}
      {waiting &&
        (canDecide ? (
          <div className="mt-4 space-y-5">
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
    </Panel>
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
          <label className="flex h-10 items-center gap-2 text-sm sm:col-span-2">
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
  const storeName = STORE_NAME;
  const canEditShipping = canAct && ['PENDING', 'CONFIRMED', 'PACKED'].includes(order.status);
  const district =
    DISTRICTS.find((d) => d.code === order.shipping.district)?.name ?? order.shipping.district;
  const byTransfer = paymentMethodOf(order) === 'BANK_TRANSFER';

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
            <Badge>{byTransfer ? 'Bank transfer' : 'Cash on delivery'}</Badge>
          </span>
        }
        description={`Placed ${formatDateTime(order.createdAt)} · ${order.lines.reduce((n, l) => n + l.qty, 0)} item(s) · ${formatLkr(order.totalCents)}`}
        actions={
          <Link
            href={`/admin/orders/${order.id}/print`}
            target="_blank"
            className={buttonVariants({ variant: 'outline' })}
          >
            <Printer aria-hidden size={15} /> Packing slip
          </Link>
        }
      />

      <Stepper order={order} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Items" flush>
            <Table>
              <Thead>
                <tr>
                  <Th>Item</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </Thead>
              <Tbody>
                {order.lines.map((l) => (
                  <Tr key={l.variantId}>
                    <Td>
                      <Link
                        href={`/admin/products/${l.productId}`}
                        className="font-medium hover:underline"
                      >
                        {l.productName}
                      </Link>
                      {l.label && <span className="text-muted"> · {l.label}</span>}
                      <span className="block font-mono text-xs text-muted">{l.sku}</span>
                    </Td>
                    <Td className="text-right tabular">{l.qty}</Td>
                    <Td className="text-right tabular">{formatLkr(l.unitPriceCents)}</Td>
                    <Td className="text-right tabular">{formatLkr(l.lineTotalCents)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <dl className="ml-auto max-w-xs space-y-1.5 p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular">{formatLkr(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery ({order.zoneName})</dt>
                <dd className="tabular">{formatLkr(order.deliveryFeeCents)}</dd>
              </div>
              {order.codFeeCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">COD fee</dt>
                  <dd className="tabular">{formatLkr(order.codFeeCents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>{byTransfer ? 'Total (bank transfer)' : 'Total to collect'}</dt>
                <dd className="tabular">{formatLkr(order.totalCents)}</dd>
              </div>
              {order.codCollectedCents !== undefined && (
                <div className="flex justify-between text-success">
                  <dt>Cash collected</dt>
                  <dd className="tabular">{formatLkr(order.codCollectedCents)}</dd>
                </div>
              )}
              {order.chargeableWeightG > 0 && (
                <p className="pt-1 text-xs text-muted">
                  Parcel weight charged: {order.chargeableWeightG} g
                </p>
              )}
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="space-y-4 text-sm">
              {[...order.history].reverse().map((h) => (
                <li key={`${h.at}-${h.to}`} className="relative pl-5">
                  <span
                    aria-hidden
                    className="absolute top-1.5 left-0 size-2 rounded-full bg-primary"
                  />
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
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Delivery first: this is where the status is moved along. */}
          <Panel
            title="Delivery"
            description={
              order.courier
                ? undefined
                : next.length > 0
                  ? 'Move the order along as it is packed, handed over and delivered.'
                  : 'This order has reached its final step.'
            }
            actions={<Truck aria-hidden size={18} className="text-muted" />}
          >
            {order.courier && (
              <p className="mb-4 rounded-sm bg-surface-muted px-3 py-2 text-sm">
                Courier <span className="font-medium">{order.courier}</span> · tracking{' '}
                <span className="font-mono">{order.trackingNo}</span>
              </p>
            )}
            {next.length > 0 ? (
              canAct ? (
                <div className="space-y-5">
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
                <Alert tone="info">Your role can view orders but not change them.</Alert>
              )
            ) : (
              <p className="text-sm text-muted">No further steps.</p>
            )}
          </Panel>

          <Panel title="Customer">
            <p className="font-medium">{order.shipping.fullName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm">
              <Phone aria-hidden size={13} className="text-muted" />
              <a href={`tel:${order.shipping.phone}`} className="text-primary hover:underline">
                {order.shipping.phone}
              </a>
            </p>
            {order.email && <p className="text-sm text-muted">{order.email}</p>}
            <ContactButtons order={order} storeName={storeName} />
            <p className="mt-3 flex gap-1.5 text-sm text-muted">
              <MapPin aria-hidden size={14} className="mt-0.5 shrink-0" />
              <span>
                {order.shipping.line1}
                {order.shipping.line2 ? `, ${order.shipping.line2}` : ''}, {order.shipping.city},{' '}
                {district}
                {order.shipping.postalCode ? ` ${order.shipping.postalCode}` : ''}
              </span>
            </p>
            {order.shipping.notes && <p className="mt-2 text-sm">Note: {order.shipping.notes}</p>}
            {canEditShipping && <ShippingForm order={order} />}
          </Panel>

          {byTransfer && <PaymentCard order={order} canDecide={can(me, 'order:payment')} />}

          {canAct && (
            <Panel title="Add a note">
              <NoteForm orderId={order.id} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
