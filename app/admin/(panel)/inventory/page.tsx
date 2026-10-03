import { DEFAULT_LOW_STOCK_THRESHOLD } from '@aussie/shared-types';
import { Card, cn } from '@aussie/ui';
import Link from 'next/link';
import { can, requirePermission } from '@/lib/admin';
import { StatusBadge } from './parts';
import { listStock } from './stock';

export const metadata = { title: 'Inventory' };

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low & sold out' },
  { id: 'out', label: 'Sold out' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const me = await requirePermission('inventory:read');
  const sp = await searchParams;
  const filter: Filter = FILTERS.find((f) => f.id === sp.filter)?.id ?? 'all';
  const [items, all] = await Promise.all([
    listStock(filter),
    filter === 'all' ? null : listStock('all'),
  ]);
  const everything = all ?? items;
  const counts = {
    total: everything.length,
    low: everything.filter((i) => i.status === 'low').length,
    out: everything.filter((i) => i.status === 'out').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            {counts.total} variants · {counts.low} low · {counts.out} sold out. Low-stock alert at{' '}
            {DEFAULT_LOW_STOCK_THRESHOLD} units unless set per variant.
          </p>
        </div>
        <Link
          href="/admin/inventory/history"
          className="text-sm font-medium text-primary hover:underline"
        >
          Stock history
        </Link>
      </div>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/admin/inventory' : `/admin/inventory?filter=${f.id}`}
            aria-current={f.id === filter ? 'page' : undefined}
            className="min-h-9 rounded-full border border-border px-3 py-1.5 text-sm aria-[current=page]:border-text aria-[current=page]:bg-text aria-[current=page]:text-bg"
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Card className="p-0">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {filter === 'all'
              ? 'No variants yet. Products appear here as soon as they are saved in the catalog.'
              : 'Nothing here. Every variant is above its alert level.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">On hand</th>
                  <th className="px-4 py-3 text-right font-medium">Alert at</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.variantId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{s.productName}</span>
                      {s.label && <span className="block text-xs text-muted">{s.label}</span>}
                      {s.productStatus !== 'ACTIVE' && (
                        <span className="block text-xs text-muted">
                          {s.productStatus === 'DRAFT' ? 'Draft' : 'Archived'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.sku}</td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-medium tabular',
                        s.status === 'out' && 'text-danger',
                      )}
                    >
                      {s.onHand}
                    </td>
                    <td className="px-4 py-3 text-right text-muted tabular">
                      {s.threshold}
                      {s.lowStockThreshold === null && <span className="sr-only"> (default)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/inventory/${s.variantId}`}
                        className="font-medium whitespace-nowrap text-primary hover:underline"
                      >
                        {can(me, 'inventory:adjust') ? 'Adjust' : 'History'}
                        <span className="sr-only"> {s.sku}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
