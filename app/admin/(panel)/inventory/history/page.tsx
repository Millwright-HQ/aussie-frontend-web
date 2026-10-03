import { Card } from '@aussie/ui';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { LedgerTable } from '../parts';
import { getLedger } from '../stock';

export const metadata = { title: 'Stock history' };

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await requirePermission('inventory:read');
  const { cursor } = await searchParams;
  const page = await getLedger({ cursor });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-muted hover:text-text">
          ← Inventory
        </Link>
        <h1 className="mt-2 text-h1">Stock history</h1>
        <p className="mt-1 text-sm text-muted">
          Every stock movement, newest first. Entries cannot be edited or deleted.
        </p>
      </div>
      <Card>
        <LedgerTable items={page.items} showItem />
        <div className="mt-4 flex gap-4 text-sm font-medium">
          {cursor && (
            <Link href="/admin/inventory/history" className="text-primary hover:underline">
              ← Newest
            </Link>
          )}
          {page.nextCursor && (
            <Link
              href={`/admin/inventory/history?cursor=${encodeURIComponent(page.nextCursor)}`}
              className="text-primary hover:underline"
            >
              Older entries →
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
