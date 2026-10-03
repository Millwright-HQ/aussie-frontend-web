import type { OrdersSummary, ReviewStatus } from '@aussie/shared-types';
import { Alert, Card, formatLkr } from '@aussie/ui';
import Link from 'next/link';
import { can, currentAdmin } from '@/lib/admin';
import { api } from '@/lib/api';
import { StatusBadge } from './inventory/parts';
import { listStock, type StockRow } from './inventory/stock';

/** Low and sold-out variants of published products, worst first. */
async function LowStockCard() {
  let rows: StockRow[];
  try {
    rows = (await listStock('low')).filter((r) => r.productStatus === 'ACTIVE');
  } catch {
    return (
      <Card>
        <h2 className="text-h3">Low stock</h2>
        <p className="mt-2 text-sm text-muted">Stock levels are unavailable right now.</p>
      </Card>
    );
  }
  rows.sort((a, b) => a.onHand - b.onHand || a.productName.localeCompare(b.productName));
  const shown = rows.slice(0, 8);
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h3">Low stock</h2>
        {rows.length > 0 && (
          <Link
            href="/admin/inventory?filter=low"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all {rows.length}
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Everything on sale is above its alert level.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {shown.map((r) => (
            <li key={r.variantId} className="flex items-center justify-between gap-4 py-2 text-sm">
              <Link href={`/admin/inventory/${r.variantId}`} className="min-w-0 hover:underline">
                <span className="font-medium">{r.productName}</span>
                {r.label && <span className="text-muted"> · {r.label}</span>}
              </Link>
              <span className="flex shrink-0 items-center gap-3">
                <span className="tabular">{r.onHand} left</span>
                <StatusBadge status={r.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  note,
  href,
  attention,
}: {
  label: string;
  value: string;
  note?: string;
  href: string;
  /** Something is waiting for a person: draws the eye without relying on colour alone. */
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-border bg-surface p-5 hover:border-text"
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular">{value}</p>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      {attention && <p className="mt-2 text-xs font-medium text-warning">Needs attention</p>}
    </Link>
  );
}

/** Orders and cash at a glance. Staff without order access never see it (the API would refuse). */
async function OrderStats() {
  let s: OrdersSummary;
  try {
    s = await api<OrdersSummary>('admin', '/v1/orders/admin/summary');
  } catch {
    return (
      <Card>
        <h2 className="text-h3">Orders</h2>
        <p className="mt-2 text-sm text-muted">Order numbers are unavailable right now.</p>
      </Card>
    );
  }
  const toShip = s.counts.CONFIRMED + s.counts.PACKED;
  return (
    <>
      <Stat
        label="Orders today"
        value={String(s.today.placed)}
        note={
          s.today.placed > 0 ? `${formatLkr(s.today.valueCents)} excluding cancelled` : undefined
        }
        href="/admin/orders?status=PENDING"
      />
      <Stat
        label="Waiting for confirmation"
        value={String(s.counts.PENDING)}
        href="/admin/orders?status=PENDING"
        attention={s.counts.PENDING > 0}
      />
      <Stat
        label="To pack and ship"
        value={String(toShip)}
        note={`${s.counts.CONFIRMED} confirmed · ${s.counts.PACKED} packed`}
        href="/admin/orders?status=CONFIRMED"
      />
      <Stat
        label="Cash to collect"
        value={formatLkr(s.awaitingCash.valueCents)}
        note={`${s.awaitingCash.count} shipped order${s.awaitingCash.count === 1 ? '' : 's'} (COD)`}
        href="/admin/orders?status=SHIPPED"
      />
    </>
  );
}

async function ReviewStat() {
  try {
    const c = await api<Record<ReviewStatus, number>>('admin', '/v1/reviews/admin/counts');
    return (
      <Stat
        label="Reviews waiting"
        value={String(c.PENDING)}
        href="/admin/reviews"
        attention={c.PENDING > 0}
      />
    );
  } catch {
    return null;
  }
}

export const metadata = { title: 'Dashboard' };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [me, { denied }] = await Promise.all([currentAdmin(), searchParams]);
  return (
    <div className="space-y-6">
      {denied && <Alert>Your role doesn't have access to that page.</Alert>}
      <div>
        <h1 className="text-h1">Welcome, {me.name.split(' ')[0]}</h1>
        <p className="mt-1 text-muted">Here is what needs doing today.</p>
      </div>
      <section aria-label="Today at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {can(me, 'order:read') && <OrderStats />}
        {can(me, 'review:read') && <ReviewStat />}
      </section>
      {can(me, 'inventory:read') && <LowStockCard />}
      {can(me, 'audit:read') && (
        <p className="text-sm text-muted">
          Who changed what:{' '}
          <Link href="/admin/audit" className="font-medium text-primary hover:underline">
            open the audit log
          </Link>
        </p>
      )}
      <Card>
        <h2 className="text-h3">Your access</h2>
        <p className="mt-2 text-sm text-muted">
          Role <span className="font-medium text-text">{me.roleId}</span> · {me.permissions.length}{' '}
          permission{me.permissions.length === 1 ? '' : 's'}
        </p>
      </Card>
    </div>
  );
}
