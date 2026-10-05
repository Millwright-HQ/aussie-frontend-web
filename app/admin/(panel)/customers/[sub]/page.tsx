import type { OrderStatus } from '@aussie/shared-types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { formatOrderDate } from '@/lib/order-format';
import {
  Avatar,
  EmptyState,
  formatLkPhone,
  formatLkr,
  PageHeader,
  Panel,
  Stat,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { OrderStatusBadge } from '@/app/admin/_ui/order-badge';

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
  const kept = orders?.filter((o) => o.status !== 'CANCELLED' && o.status !== 'RETURNED');
  const spent = kept?.reduce((n, o) => n + o.totalCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={customer.name} size={40} />
            {customer.name}
          </span>
        }
        description={`Customer since ${formatDateTime(customer.createdAt)}`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={orders ? orders.length : '—'} />
        <Stat label="Spent" value={spent !== undefined ? formatLkr(spent) : '—'} note="excl. cancelled & returned" />
        <Stat label="Offers by email" value={customer.marketingOptIn ? 'Subscribed' : 'Not subscribed'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Panel title="Contact">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="break-all">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Mobile</dt>
              <dd className="tabular">{customer.phone ? formatLkPhone(customer.phone) : '—'}</dd>
            </div>
          </dl>
          {can(me, 'audit:read') && (
            <Link
              href={`/admin/audit?actorType=customer&actorSub=${customer.sub}`}
              className="mt-4 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              See this customer’s activity
            </Link>
          )}
        </Panel>

        {orders && (
          <Panel title="Orders" flush>
            {orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Placed</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {orders.map((o) => (
                    <Tr key={o.id}>
                      <Td>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.orderNumber}
                        </Link>
                        <span className="block text-xs text-muted">
                          {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-muted">{formatOrderDate(o.createdAt)}</Td>
                      <Td className="text-right tabular">{formatLkr(o.totalCents)}</Td>
                      <Td>
                        <OrderStatusBadge status={o.status} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
