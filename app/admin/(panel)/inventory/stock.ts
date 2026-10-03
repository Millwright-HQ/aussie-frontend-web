import 'server-only';
import type { LedgerEntry, StockItem, StockStatus } from '@aussie/shared-types';
import { api } from '@/lib/api';

export type StockRow = StockItem & { status: StockStatus; threshold: number };

export const listStock = async (filter: 'all' | 'low' | 'out') =>
  (await api<{ items: StockRow[] }>('admin', `/v1/inventory/admin/stock?filter=${filter}`)).items;

export const getStock = (variantId: string) =>
  api<StockRow>('admin', `/v1/inventory/admin/stock/${variantId}`);

export function getLedger(opts: { variantId?: string; cursor?: string; limit?: number }) {
  const q = new URLSearchParams({ limit: String(opts.limit ?? 50) });
  if (opts.variantId) q.set('variantId', opts.variantId);
  if (opts.cursor) q.set('cursor', opts.cursor);
  return api<{ items: LedgerEntry[]; nextCursor?: string }>(
    'admin',
    `/v1/inventory/admin/ledger?${q}`,
  );
}

export const REASON_LABELS: Record<LedgerEntry['reason'], string> = {
  RECEIVED: 'Received',
  RETURNED: 'Customer return',
  DAMAGED: 'Damaged / lost',
  CORRECTION: 'Stock count correction',
  SALE: 'Order',
  ORDER_CANCELLED: 'Order cancelled',
};
