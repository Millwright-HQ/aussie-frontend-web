import { Card, formatLkPhone, formatLkr } from '@aussie/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { formatOrderDate, statusLabel, statusTone } from '@/lib/order-format';
import type { OrderStatus } from '@aussie/shared-types';

export const metadata = { title: 'Customer' };

interface Customer {
  sub: string;
  email: string;
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: string;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  createdAt: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerPage({ params }: { params: Promise<{ sub: string }> }) {
  const me = await requirePermission('customer:read');
  const { sub } = await params;
  if (!UUID.test(sub)) notFound();
  const customer = await api<Customer>('admin', `/v1/identity/admin/customers/${sub}`).catch(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    },
  );
  if (!customer) notFound();
  // Order history is shown only to staff who may read orders.
  const orders = can(me, 'order:read')
    ? (await api<{ items: OrderRow[] }>('admin', `/v1/orders/admin/customers/${sub}/orders`)).items
    : null;
  const spent = orders
    ?.filter((o) => o.status !== 'CANCELLED' && o.status !== 'RETURNED')
    .reduce((n, o) => n + o.totalCents, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-muted hover:text-text">
          ← Customers
        </Link>
        <h1 className="mt-2 text-h1">{customer.name}</h1>
      </div>
      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Mobile</dt>
            <dd className="tabular">{customer.phone ? formatLkPhone(customer.phone) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Joined</dt>
            <dd>{formatDateTime(customer.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Offers by email</dt>
            <dd>{customer.marketingOptIn ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </Card>

      {orders && (
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-h3">Orders</h2>
            {spent !== undefined && orders.length > 0 && (
              <p className="text-sm text-muted">
                {orders.length} order{orders.length === 1 ? '' : 's'} · {formatLkr(spent)} excluding
                cancelled and returned
              </p>
            )}
          </div>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="block text-xs text-muted">
                      {formatOrderDate(o.createdAt)} · {o.itemCount} item
                      {o.itemCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular">{formatLkr(o.totalCents)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
