import type { Order } from '@aussie/shared-types';
import { formatLkr } from '@/app/admin/_ui';
import { DISTRICTS, ulidSchema } from '@aussie/validation';
import { notFound } from 'next/navigation';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { PrintButton } from './print-button';

export const metadata = { title: 'Packing slip' };

/** One printed page: what to pack, where it goes and how much cash to collect. */
export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('order:read');
  const { id } = await params;
  if (!ulidSchema.safeParse(id).success) notFound();
  const order = await api<Order>('admin', `/v1/orders/admin/orders/${id}`).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!order) notFound();
  const district =
    DISTRICTS.find((d) => d.code === order.shipping.district)?.name ?? order.shipping.district;

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-8 text-black print:max-w-none print:p-0">
      <div className="flex items-start justify-between print:hidden">
        <p className="text-sm text-neutral-600">Print this page (Ctrl/Cmd + P)</p>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b border-black pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Packing slip</h1>
          <p className="text-sm">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{order.orderNumber}</p>
      </header>

      <section className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h2 className="font-semibold">Deliver to</h2>
          <p>{order.shipping.fullName}</p>
          <p>{order.shipping.line1}</p>
          {order.shipping.line2 && <p>{order.shipping.line2}</p>}
          <p>
            {order.shipping.city}, {district} {order.shipping.postalCode ?? ''}
          </p>
          <p className="mt-1 font-semibold">{order.shipping.phone}</p>
          {order.shipping.notes && <p className="mt-1">Note: {order.shipping.notes}</p>}
          {order.instructions && <p className="mt-1">Order instructions: {order.instructions}</p>}
        </div>
        <div>
          <h2 className="font-semibold">Collect cash on delivery</h2>
          <p className="text-3xl font-semibold tabular-nums">{formatLkr(order.totalCents)}</p>
          {order.courier && (
            <p className="mt-1">
              {order.courier} · {order.trackingNo}
            </p>
          )}
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-2">Packed</th>
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.variantId} className="border-b border-neutral-300">
              <td className="py-2">☐</td>
              <td className="py-2">
                {l.productName}
                {l.label ? ` · ${l.label}` : ''}
              </td>
              <td className="py-2 font-mono text-xs">{l.sku}</td>
              <td className="py-2 text-right tabular-nums">{l.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatLkr(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className="tabular-nums">{formatLkr(order.deliveryFeeCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>COD fee</dt>
          <dd className="tabular-nums">{formatLkr(order.codFeeCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatLkr(order.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
