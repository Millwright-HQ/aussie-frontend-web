import type { LedgerEntry, StockStatus } from '@aussie/shared-types';
import Link from 'next/link';
import { formatDateTime } from '@/lib/admin';
import { Badge, type BadgeTone, cn, Table, Tbody, Td, Th, Thead, Tr } from '@/app/admin/_ui';
import { REASON_LABELS } from './stock';

const STATUS: Record<StockStatus, { label: string; tone: BadgeTone }> = {
  in: { label: 'In stock', tone: 'success' },
  low: { label: 'Low', tone: 'warning' },
  out: { label: 'Sold out', tone: 'danger' },
};

export function StatusBadge({ status }: { status: StockStatus }) {
  const s = Object.entries(STATUS).find(([k]) => k === status)?.[1] ?? STATUS.in;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const delta = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Ledger table; `showItem` adds the SKU column for the store-wide history. */
export function LedgerTable({ items, showItem }: { items: LedgerEntry[]; showItem?: boolean }) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">No stock movements yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <Thead>
          <tr>
            <Th>When</Th>
            {showItem && <Th>SKU</Th>}
            <Th>Change</Th>
            <Th>After</Th>
            <Th>Reason</Th>
            <Th>By</Th>
          </tr>
        </Thead>
        <Tbody>
          {items.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(e.at)}</Td>
              {showItem && (
                <Td>
                  <Link
                    href={`/admin/products/stock/${e.variantId}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {e.sku}
                  </Link>
                </Td>
              )}
              <Td
                className={cn('font-medium tabular', e.delta < 0 ? 'text-danger' : 'text-success')}
              >
                {delta(e.delta)}
              </Td>
              <Td className="tabular">{e.onHandAfter}</Td>
              <Td>
                {REASON_LABELS[e.reason]}
                {e.note && <span className="block text-xs text-muted">{e.note}</span>}
              </Td>
              <Td className="text-muted">
                {e.actor.startsWith('order:') ? 'System' : (e.actorName ?? 'Admin')}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
