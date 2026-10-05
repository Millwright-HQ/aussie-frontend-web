import { requirePermission } from '@/lib/admin';
import { PageHeader, Pager, Panel } from '@/app/admin/_ui';
import { LedgerTable } from '../stock/parts';
import { getLedger } from '../stock/stock';

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
    <div>
      <PageHeader
        back={{ href: '/admin/products', label: 'Products' }}
        title="Stock history"
        description="Every stock movement across the store, newest first. Entries cannot be edited or deleted."
      />
      <Panel flush>
        <LedgerTable items={page.items} showItem />
      </Panel>
      <Pager
        prev={cursor ? '/admin/products/stock-history' : undefined}
        next={
          page.nextCursor
            ? `/admin/products/stock-history?cursor=${encodeURIComponent(page.nextCursor)}`
            : undefined
        }
      />
    </div>
  );
}
