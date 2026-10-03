import type { LedgerEntry, StockStatus } from '@aussie/shared-types';
import { cn } from '@aussie/ui';
import Link from 'next/link';
import { formatDateTime } from '@/lib/admin';
import { REASON_LABELS } from './stock';

const STATUS: Record<StockStatus, { label: string; className: string }> = {
  in: { label: 'In stock', className: 'bg-success/15 text-success' },
  low: { label: 'Low', className: 'bg-warning/15 text-warning' },
  out: { label: 'Sold out', className: 'bg-danger/15 text-danger' },
};

export function StatusBadge({ status }: { status: StockStatus }) {
  // eslint-disable-next-line security/detect-object-injection -- status is a closed union
  const s = STATUS[status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.className)}>
      {s.label}
    </span>
  );
}

const delta = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Ledger table; `showItem` adds the SKU column for the store-wide history. */
export function LedgerTable({ items, showItem }: { items: LedgerEntry[]; showItem?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted">No stock movements yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-border">
            <th className="py-2 pr-4 font-medium">When</th>
            {showItem && <th className="py-2 pr-4 font-medium">SKU</th>}
            <th className="py-2 pr-4 font-medium">Change</th>
            <th className="py-2 pr-4 font-medium">After</th>
            <th className="py-2 pr-4 font-medium">Reason</th>
            <th className="py-2 pr-4 font-medium">By</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-b border-border align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(e.at)}</td>
              {showItem && (
                <td className="py-2 pr-4">
                  <Link href={`/admin/inventory/${e.variantId}`} className="hover:underline">
                    {e.sku}
                  </Link>
                </td>
              )}
              <td
                className={cn(
                  'py-2 pr-4 font-medium tabular',
                  e.delta < 0 ? 'text-danger' : 'text-success',
                )}
              >
                {delta(e.delta)}
              </td>
              <td className="py-2 pr-4 tabular">{e.onHandAfter}</td>
              <td className="py-2 pr-4">
                {REASON_LABELS[e.reason]}
                {e.note && <span className="block text-xs text-muted">{e.note}</span>}
              </td>
              <td className="py-2 pr-4 text-muted">
                {e.actor.startsWith('order:') ? 'System' : (e.actorName ?? 'Admin')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
