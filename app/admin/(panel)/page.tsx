import {
  ORDER_STATUSES,
  type OrdersAnalytics,
  type OrderStatus,
  type ReviewStatus,
} from '@aussie/shared-types';
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  PackageCheck,
  ShoppingBag,
  Star,
  Truck,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { can, currentAdmin } from '@/lib/admin';
import { api } from '@/lib/api';
import { statusLabel } from '@/lib/order-format';
import {
  Alert,
  AreaChart,
  BarList,
  Donut,
  EmptyState,
  formatLkr,
  PageHeader,
  Panel,
  Pills,
  Stat,
} from '../_ui';
import { StatusBadge } from './products/stock/parts';
import { listStock, type StockRow } from './products/stock/stock';

export const metadata = { title: 'Dashboard' };

const RANGES = [7, 30, 90] as const;

const SHORT_DATE = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** "+12% vs previous 30 days", or "new" when there was nothing before. */
function trend(current: number, previous: number, days: number) {
  if (previous === 0) return current > 0 ? { text: `new in the last ${days} days`, tone: 'up' as const } : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct >= 0 ? '+' : ''}${pct}% vs previous ${days} days`,
    tone: pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('flat' as const),
  };
}

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Colombo' }).format(new Date()),
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

async function LowStock() {
  let rows: StockRow[];
  try {
    rows = (await listStock('low')).filter((r) => r.productStatus === 'ACTIVE');
  } catch {
    return (
      <Panel title="Low stock">
        <p className="text-sm text-muted">Stock levels are unavailable right now.</p>
      </Panel>
    );
  }
  rows.sort((a, b) => a.onHand - b.onHand || a.productName.localeCompare(b.productName));
  return (
    <Panel
      title="Low stock"
      description="Published items at or below their alert level, worst first."
      actions={
        rows.length > 0 ? (
          <Link href="/admin/products?stock=low" className="text-[13px] font-medium text-primary hover:underline">
            View all {rows.length}
          </Link>
        ) : undefined
      }
      flush
    >
      {rows.length === 0 ? (
        <EmptyState title="All stocked up">Everything on sale is above its alert level.</EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 7).map((r) => (
            <li key={r.variantId} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
              <Link
                href={`/admin/products/${r.productId}/stock/${r.variantId}`}
                className="min-w-0 truncate hover:underline"
              >
                <span className="font-medium">{r.productName}</span>
                {r.label && <span className="text-muted"> · {r.label}</span>}
              </Link>
              <span className="flex shrink-0 items-center gap-3">
                <span className="tabular text-muted">{r.onHand} left</span>
                <StatusBadge status={r.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Attention({
  items,
}: {
  items: { label: string; value: number; href: string; icon: React.ReactNode }[];
}) {
  const open = items.filter((i) => i.value > 0);
  if (open.length === 0) {
    return (
      <Alert tone="success">
        <span className="flex items-center gap-2">
          <ClipboardCheck aria-hidden size={16} /> Nothing is waiting for you. Everything is up to date.
        </span>
      </Alert>
    );
  }
  return (
    <section aria-label="Needs attention">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle aria-hidden size={15} className="text-warning" /> Needs attention
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {open.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            className="flex items-center gap-3 rounded-xl border border-warning/35 bg-warning/8 p-3.5 transition-colors hover:bg-warning/14"
          >
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-warning/18 text-warning">
              {i.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xl leading-tight font-semibold tabular">{i.value}</span>
              <span className="block truncate text-[13px] text-muted">{i.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; days?: string }>;
}) {
  const [me, sp] = await Promise.all([currentAdmin(), searchParams]);
  const days = RANGES.find((d) => String(d) === sp.days) ?? 30;

  const [analytics, reviews] = await Promise.all([
    can(me, 'order:read')
      ? api<OrdersAnalytics>('admin', `/v1/orders/admin/analytics?days=${days}`).catch(() => null)
      : Promise.resolve(null),
    can(me, 'review:read')
      ? api<Record<ReviewStatus, number>>('admin', '/v1/reviews/admin/counts').catch(() => null)
      : Promise.resolve(null),
  ]);

  const attention = [
    ...(analytics
      ? [
          { label: 'Orders to confirm', value: analytics.attention.awaitingConfirmation, href: '/admin/orders?status=PENDING', icon: <ShoppingBag aria-hidden size={18} /> },
          { label: 'Transfer slips to check', value: analytics.attention.transferProofsToReview, href: '/admin/orders?status=PENDING', icon: <Banknote aria-hidden size={18} /> },
          { label: 'To pack and ship', value: analytics.attention.toShip, href: '/admin/orders?status=CONFIRMED', icon: <Truck aria-hidden size={18} /> },
          { label: 'Refunds due', value: analytics.attention.refundsDue, href: '/admin/orders?status=CANCELLED', icon: <Undo2 aria-hidden size={18} /> },
        ]
      : []),
    ...(reviews
      ? [{ label: 'Reviews to moderate', value: reviews.PENDING, href: '/admin/reviews', icon: <Star aria-hidden size={18} /> }]
      : []),
  ];

  const a = analytics;
  const statusCount = (s: OrderStatus) =>
    Object.entries(a?.byStatus ?? {}).find(([k]) => k === s)?.[1] ?? 0;
  const activeDays = a ? a.series.filter((d) => d.orders > 0).length : 0;

  return (
    <div className="space-y-6">
      {sp.denied && <Alert>Your role doesn&apos;t have access to that page.</Alert>}
      <PageHeader
        title={`${greeting()}, ${me.name.split(' ')[0]}`}
        description="How the store is doing, and what needs you."
        actions={
          can(me, 'order:read') ? (
            <Pills
              current={String(days)}
              items={RANGES.map((d) => ({
                key: String(d),
                label: `${d} days`,
                href: d === 30 ? '/admin' : `/admin?days=${d}`,
              }))}
            />
          ) : undefined
        }
      />

      {attention.length > 0 && <Attention items={attention} />}

      {a ? (
        <>
          <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Revenue"
              icon={<CircleDollarSign aria-hidden size={16} />}
              value={formatLkr(a.totals.revenueCents)}
              trend={trend(a.totals.revenueCents, a.previous.revenueCents, days)}
              note="excl. cancelled & returned"
            />
            <Stat
              label="Orders"
              icon={<ShoppingBag aria-hidden size={16} />}
              value={a.totals.orders}
              trend={trend(a.totals.orders, a.previous.orders, days)}
              href="/admin/orders"
            />
            <Stat
              label="Average order"
              icon={<PackageCheck aria-hidden size={16} />}
              value={formatLkr(a.totals.averageOrderCents)}
              note={`${a.totals.delivered} delivered`}
            />
            <Stat
              label="Cancelled or returned"
              icon={<Undo2 aria-hidden size={16} />}
              value={`${Math.round(a.totals.lossRate * 100)}%`}
              note={`${a.totals.cancelled} cancelled · ${a.totals.returned} returned`}
              attention={a.totals.lossRate > 0.15 && a.totals.orders >= 10}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Revenue"
              description={`${SHORT_DATE(a.from)} to ${SHORT_DATE(a.to)}${activeDays ? ` · ${activeDays} day${activeDays === 1 ? '' : 's'} with orders` : ''}`}
            >
              {a.totals.orders === 0 ? (
                <EmptyState title="No orders in this period">
                  Revenue appears here as soon as orders come in.
                </EmptyState>
              ) : (
                <AreaChart
                  ariaLabel={`Revenue per day, last ${days} days`}
                  data={a.series.map((d) => ({ label: SHORT_DATE(d.date), value: d.revenueCents / 100 }))}
                  format={(n) => (n >= 1000 ? `Rs ${Math.round(n / 1000)}k` : `Rs ${Math.round(n)}`)}
                  height={230}
                />
              )}
            </Panel>
            <Panel title="Orders by status" description="Where this period's orders are now.">
              <BarList
                empty="No orders in this period."
                rows={ORDER_STATUSES.filter((s) => statusCount(s) > 0).map((s) => ({
                  label: statusLabel(s),
                  value: statusCount(s),
                  tone:
                    s === 'DELIVERED'
                      ? 'success'
                      : s === 'CANCELLED' || s === 'RETURNED'
                        ? 'danger'
                        : s === 'PENDING'
                          ? 'warning'
                          : 'primary',
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Best sellers" description="By revenue.">
              <BarList
                empty="No sales yet in this period."
                format={(n) => formatLkr(n)}
                rows={a.topProducts.map((p) => ({
                  label: (
                    <Link href={`/admin/products/${p.productId}`} className="hover:underline">
                      {p.name}
                    </Link>
                  ),
                  value: p.revenueCents,
                  note: `${p.units} sold`,
                }))}
              />
            </Panel>
            <Panel title="How customers pay">
              {a.totals.orders === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No orders yet.</p>
              ) : (
                <Donut
                  parts={[
                    { label: 'Cash on delivery', value: a.byPayment.COD.revenueCents, className: 'stroke-primary', dot: 'bg-primary' },
                    { label: 'Bank transfer', value: a.byPayment.BANK_TRANSFER.revenueCents, className: 'stroke-success', dot: 'bg-success' },
                  ]}
                  format={(n) => formatLkr(n)}
                  centre={
                    <>
                      <span className="text-xs text-muted">Orders</span>
                      <span className="text-xl font-semibold tabular">
                        {a.byPayment.COD.orders + a.byPayment.BANK_TRANSFER.orders}
                      </span>
                    </>
                  }
                />
              )}
            </Panel>
            <Panel title="Top districts" description="Where orders are going.">
              <BarList
                empty="No deliveries yet."
                format={(n) => formatLkr(n)}
                rows={a.topDistricts.map((d) => ({
                  label: d.district,
                  value: d.revenueCents,
                  note: `${d.orders} order${d.orders === 1 ? '' : 's'}`,
                  tone: 'success',
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Customers" description="Who placed this period's orders.">
              {a.customers.signedIn + a.customers.guests === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No orders yet.</p>
              ) : (
                <Donut
                  parts={[
                    { label: 'Signed-in customers', value: a.customers.signedIn, className: 'stroke-primary', dot: 'bg-primary' },
                    { label: 'Guest checkout', value: a.customers.guests, className: 'stroke-muted', dot: 'bg-muted' },
                  ]}
                />
              )}
              {a.totals.avgDeliveryDays !== null && (
                <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                  Average time from order to delivery:{' '}
                  <span className="font-medium text-text">{a.totals.avgDeliveryDays} days</span>
                </p>
              )}
            </Panel>
            {can(me, 'inventory:read') ? <LowStock /> : null}
          </div>
        </>
      ) : can(me, 'order:read') ? (
        <Alert tone="warning">Sales numbers are unavailable right now. Try again in a moment.</Alert>
      ) : (
        <Panel title="Your access">
          <p className="text-sm text-muted">
            Role <span className="font-medium text-text">{me.roleId}</span> · {me.permissions.length}{' '}
            permission{me.permissions.length === 1 ? '' : 's'}. Use the menu to open the areas you can manage.
          </p>
          {can(me, 'inventory:read') && <div className="mt-4"><LowStock /></div>}
        </Panel>
      )}
    </div>
  );
}
