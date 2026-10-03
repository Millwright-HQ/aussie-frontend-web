import type { OrderStatus } from '@aussie/shared-types';
import { Card, formatLkr } from '@aussie/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { requireCustomerSession } from '@/lib/auth/session';
import { formatOrderDate, statusLabel, statusTone } from '@/lib/order-format';
import { AccountLayout } from '../account-nav';

export const metadata = { title: 'My orders' };

interface Row {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  createdAt: string;
}

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await requireCustomerSession('/account/orders');
  const { cursor } = await searchParams;
  const qs = new URLSearchParams({ limit: '20', ...(cursor ? { cursor } : {}) });
  const page = await api<{ items: Row[]; nextCursor: string | null }>(
    'customer',
    `/v1/orders/my?${qs}`,
  );

  return (
    <AccountLayout current="/account/orders">
      <Card>
        <h2 className="text-h2">Orders</h2>
        {page.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No orders yet.{' '}
            <Link href="/shop" className="underline">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {page.items.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link href={`/account/orders/${o.id}`} className="font-medium hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatOrderDate(o.createdAt)} · {o.itemCount} item
                    {o.itemCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                  <span className="text-sm tabular">{formatLkr(o.totalCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {page.nextCursor && (
          <Link
            href={`/account/orders?cursor=${encodeURIComponent(page.nextCursor)}`}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Older orders →
          </Link>
        )}
      </Card>
    </AccountLayout>
  );
}
