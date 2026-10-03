import {
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@aussie/shared-types';
import { Card, formatLkr } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { formatOrderDate, paymentStatusLabel, statusLabel, statusTone } from '@/lib/order-format';

export const metadata = { title: 'Orders' };

interface Row {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  name: string;
  phone: string;
  district: string;
  totalCents: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  itemCount: number;
  createdAt: string;
}

export default async function OrdersBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  await requirePermission('order:read');
  const sp = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === sp.status) ?? 'PENDING';
  const q = sp.q?.trim().slice(0, 30) || undefined;
  const qs = new URLSearchParams({
    status,
    limit: '25',
    ...(q ? { q } : {}),
    ...(sp.cursor ? { cursor: sp.cursor } : {}),
  });

  const [counts, result] = await Promise.all([
    api<Record<OrderStatus, number>>('admin', '/v1/orders/admin/counts'),
    api<{ items: Row[]; nextCursor: string | null }>('admin', `/v1/orders/admin/orders?${qs}`)
      .then((page) => ({ page, error: undefined as string | undefined }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 400) {
          return { page: { items: [] as Row[], nextCursor: null }, error: err.userMessage };
        }
        throw err;
      }),
  ]);
  const { page, error } = result;
  const districtName = (code: string) => DISTRICTS.find((d) => d.code === code)?.name ?? code;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1">Orders</h1>
        <form method="get" role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search by order number or phone
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Order no. or phone"
            className="min-h-11 w-56 rounded-sm border border-border bg-surface px-3"
          />
          <button
            type="submit"
            className="min-h-11 rounded-sm bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            Search
          </button>
        </form>
      </div>

      <nav aria-label="Order status" className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            aria-current={!q && s === status ? 'page' : undefined}
            className="min-h-9 rounded-full border border-border px-3 py-1.5 text-sm aria-[current=page]:border-text aria-[current=page]:bg-text aria-[current=page]:text-bg"
          >
            {statusLabel(s)}{' '}
            <span className="tabular opacity-70">
              {Object.entries(counts).find(([k]) => k === s)?.[1] ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-primary">
          Download orders as a spreadsheet (CSV)
        </summary>
        <form
          method="get"
          action="/admin/orders/export"
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="block text-xs text-muted">From</span>
            <input
              type="date"
              name="from"
              required
              className="min-h-11 rounded-sm border border-border bg-surface px-3"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-muted">To</span>
            <input
              type="date"
              name="to"
              required
              className="min-h-11 rounded-sm border border-border bg-surface px-3"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-sm border border-border px-4 text-sm font-medium"
          >
            Download
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Every order placed in that range, all statuses, up to one year at a time. Dates follow Sri
          Lanka time.
        </p>
      </details>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Card className="p-0">
        {page.items.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {q ? 'No orders match that search.' : 'No orders in this status.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">District</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {o.name}
                      <span className="block text-xs text-muted">{o.phone}</span>
                    </td>
                    <td className="px-4 py-3">{districtName(o.district)}</td>
                    <td className="px-4 py-3 text-right tabular">{o.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular">{formatLkr(o.totalCents)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatOrderDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                      {o.paymentMethod === 'BANK_TRANSFER' && o.status === 'PENDING' && (
                        <span
                          className={`mt-1 block text-xs ${o.paymentStatus === 'PROOF_SUBMITTED' ? 'font-medium text-warning' : 'text-muted'}`}
                        >
                          {paymentStatusLabel(o.paymentStatus)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {page.nextCursor && (
        <Link
          href={`/admin/orders?status=${status}&cursor=${encodeURIComponent(page.nextCursor)}`}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Older orders →
        </Link>
      )}
    </div>
  );
}
