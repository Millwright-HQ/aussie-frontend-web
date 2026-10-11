import {
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@aussie/shared-types';
import { DISTRICTS } from '@aussie/validation';
import { ChevronRight, Download, Inbox, Search } from 'lucide-react';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { listOpenHolds } from '@/lib/holds';
import { formatOrderDate, statusLabel } from '@/lib/order-format';
import {
  Button,
  EmptyState,
  formatLkr,
  PageHeader,
  Pager,
  Pills,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { OrderStatusBadge, PaymentBadge } from '@/app/admin/_ui/order-badge';
import { HoldsIndicator } from './holds-indicator';

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

  const [counts, result, holds] = await Promise.all([
    api<Record<OrderStatus, number>>('admin', '/v1/orders/admin/counts'),
    api<{ items: Row[]; nextCursor: string | null }>('admin', `/v1/orders/admin/orders?${qs}`)
      .then((page) => ({ page, error: undefined as string | undefined }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 400) {
          return { page: { items: [] as Row[], nextCursor: null }, error: err.userMessage };
        }
        throw err;
      }),
    listOpenHolds(),
  ]);
  const { page, error } = result;
  const districtName = (code: string) => DISTRICTS.find((d) => d.code === code)?.name ?? code;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Open an order to confirm it, check payment, and move it through delivery."
        actions={
          <div className="flex items-center gap-2">
            <HoldsIndicator holds={holds} />
            <form method="get" role="search" className="relative">
              <label htmlFor="q" className="sr-only">
                Search by order number or phone
              </label>
              <Search
                aria-hidden
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Order no. or phone"
                className="h-10 w-64 rounded-sm border border-border bg-surface pr-3 pl-9 text-sm shadow-sm"
              />
            </form>
          </div>
        }
      />

      <div className="mb-4">
        <Pills
          current={q ? '' : status}
          items={ORDER_STATUSES.map((s) => ({
            key: s,
            label: statusLabel(s),
            count: Object.entries(counts).find(([k]) => k === s)?.[1] ?? 0,
            href: `/admin/orders?status=${s}`,
          }))}
        />
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <TableShell>
        {page.items.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} />}
            title={q ? 'No orders match that search' : 'No orders in this status'}
          >
            {q
              ? 'Check the order number or phone and try again.'
              : 'New orders show up here as customers place them.'}
          </EmptyState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>District</Th>
                <Th className="text-right">Items</Th>
                <Th className="text-right">Total</Th>
                <Th>Placed</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </Thead>
            <Tbody>
              {page.items.map((o) => (
                <Tr key={o.id}>
                  <Td>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </Td>
                  <Td>
                    {o.name}
                    <span className="block text-xs text-muted">{o.phone}</span>
                  </Td>
                  <Td>{districtName(o.district)}</Td>
                  <Td className="text-right tabular">{o.itemCount}</Td>
                  <Td className="text-right font-medium tabular">{formatLkr(o.totalCents)}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatOrderDate(o.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <OrderStatusBadge status={o.status} />
                      {o.paymentMethod === 'BANK_TRANSFER' && o.status === 'PENDING' && (
                        <PaymentBadge status={o.paymentStatus} />
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      aria-label={`Open order ${o.orderNumber}`}
                      title={`Open order ${o.orderNumber}`}
                      className="inline-flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface-muted hover:text-text"
                    >
                      <ChevronRight aria-hidden size={16} />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </TableShell>
      <Pager
        prev={sp.cursor ? `/admin/orders?status=${status}` : undefined}
        next={
          page.nextCursor
            ? `/admin/orders?status=${status}&cursor=${encodeURIComponent(page.nextCursor)}`
            : undefined
        }
      />

      <details className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
          <Download aria-hidden size={15} /> Download orders as a spreadsheet (CSV)
        </summary>
        <form
          method="get"
          action="/admin/orders/export"
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-muted">From</span>
            <input
              type="date"
              name="from"
              required
              className="h-10 rounded-sm border border-border bg-surface px-3 shadow-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">To</span>
            <input
              type="date"
              name="to"
              required
              className="h-10 rounded-sm border border-border bg-surface px-3 shadow-sm"
            />
          </label>
          <Button type="submit" variant="outline">
            Download
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Every order placed in that range, all statuses, up to one year at a time. Dates follow Sri
          Lanka time.
        </p>
      </details>
    </div>
  );
}
