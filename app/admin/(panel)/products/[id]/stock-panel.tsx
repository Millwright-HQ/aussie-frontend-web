import type { ProductDetail, Variant } from '@aussie/shared-types';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@aussie/shared-types';
import { History } from 'lucide-react';
import Link from 'next/link';
import { Badge, cn, Panel, Table, Tbody, Td, Th, Thead, Tr } from '@/app/admin/_ui';
import { heldByVariant, listOpenHolds } from '@/lib/holds';
import { adjustStockAction } from '../stock/actions';
import { StatusBadge } from '../stock/parts';
import { QuickAdjust } from '../stock/quick-adjust';
import { listStock, type StockRow } from '../stock/stock';

const variantName = (v: Variant) => v.options.map((o) => o.value).join(' · ') || 'Standard';

/**
 * Stock for one product, at the top of its page: every variant's units and state, a quick
 * "received / damaged / correction" form, and a link to the variant's full history and alert level.
 */
export async function StockPanel({
  product,
  canAdjust,
}: {
  product: ProductDetail;
  canAdjust: boolean;
}) {
  let rows: StockRow[] | null;
  try {
    rows = (await listStock('all')).filter((r) => r.productId === product.id && !r.removed);
  } catch {
    rows = null;
  }
  const byVariant = new Map((rows ?? []).map((r) => [r.variantId, r]));
  // Units taken off sale by customers who are in checkout right now (already left out of "On hand").
  const held = heldByVariant(await listOpenHolds());
  const total = (rows ?? []).reduce((n, r) => n + r.onHand, 0);
  const anyOut = (rows ?? []).some((r) => r.status === 'out');
  const anyLow = (rows ?? []).some((r) => r.status === 'low');

  return (
    <Panel
      title="Stock"
      description={
        rows === null
          ? 'Stock levels are unavailable right now.'
          : `${total} unit${total === 1 ? '' : 's'} across ${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}. Every change is recorded with your name.`
      }
      actions={
        <>
          {rows && (anyOut || anyLow) && (
            <Badge tone={anyOut ? 'danger' : 'warning'}>
              {anyOut ? 'Some sold out' : 'Running low'}
            </Badge>
          )}
          <Link
            href="/admin/products/stock-history"
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] text-muted hover:bg-surface-muted hover:text-text"
          >
            <History aria-hidden size={14} /> All stock history
          </Link>
        </>
      }
      flush
    >
      <div className="overflow-x-auto">
        <Table>
          <Thead>
            <tr>
              <Th>Variant</Th>
              <Th className="text-right">On hand</Th>
              <Th>Status</Th>
              <Th className="text-right">Alert at</Th>
              {canAdjust && <Th>Change stock</Th>}
              <Th>
                <span className="sr-only">History</span>
              </Th>
            </tr>
          </Thead>
          <Tbody>
            {product.variants.map((v) => {
              const s = byVariant.get(v.id);
              return (
                <Tr key={v.id}>
                  <Td>
                    <span className="block font-medium">{variantName(v)}</span>
                    <span className="block font-mono text-xs text-muted">{v.sku}</span>
                  </Td>
                  <Td
                    className={cn(
                      'text-right text-lg font-semibold tabular',
                      s?.status === 'out' && 'text-danger',
                    )}
                  >
                    {s ? s.onHand : '—'}
                    {(held.get(v.id) ?? 0) > 0 && (
                      <span
                        className="block text-xs font-normal text-muted"
                        title="Taken off sale while these customers check out. It comes back if they don't order in time."
                      >
                        {held.get(v.id)} held in checkout
                      </span>
                    )}
                  </Td>
                  <Td>
                    {s ? (
                      <StatusBadge status={s.status} />
                    ) : (
                      <span className="text-muted">Not tracked yet</span>
                    )}
                  </Td>
                  <Td className="text-right text-muted tabular">
                    {s ? s.threshold : DEFAULT_LOW_STOCK_THRESHOLD}
                  </Td>
                  {canAdjust && (
                    <Td>
                      {s ? (
                        <QuickAdjust action={adjustStockAction.bind(null, v.id)} sku={v.sku} />
                      ) : (
                        <span className="text-xs text-muted">
                          Appears a few seconds after the product is saved.
                        </span>
                      )}
                    </Td>
                  )}
                  <Td className="text-right">
                    {s && (
                      <Link
                        href={`/admin/products/${product.id}/stock/${v.id}`}
                        className="text-[13px] font-medium whitespace-nowrap text-primary hover:underline"
                      >
                        History &amp; alert level
                        <span className="sr-only"> for {v.sku}</span>
                      </Link>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>
    </Panel>
  );
}
