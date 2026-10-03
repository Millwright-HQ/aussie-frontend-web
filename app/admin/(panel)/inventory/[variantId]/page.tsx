import { type ADJUSTMENT_REASONS, DEFAULT_LOW_STOCK_THRESHOLD } from '@aussie/shared-types';
import { Card, Field, Input, Select } from '@aussie/ui';
import { ulidSchema } from '@aussie/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, requirePermission } from '@/lib/admin';
import { ApiError } from '@/lib/api';
import { ActionForm } from '../../action-form';
import { adjustStockAction, setThresholdAction } from '../actions';
import { LedgerTable, StatusBadge } from '../parts';
import { getLedger, getStock } from '../stock';

export const metadata = { title: 'Stock' };

const REASON_OPTIONS = [
  { value: 'RECEIVED', label: 'Received (add units)' },
  { value: 'RETURNED', label: 'Customer return (add units)' },
  { value: 'DAMAGED', label: 'Damaged / lost (negative number)' },
  { value: 'CORRECTION', label: 'Stock count correction (either direction)' },
] as const satisfies readonly { value: (typeof ADJUSTMENT_REASONS)[number]; label: string }[];

export default async function StockItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const me = await requirePermission('inventory:read');
  const [{ variantId }, { cursor }] = await Promise.all([params, searchParams]);
  if (!ulidSchema.safeParse(variantId).success) notFound();
  const [stock, ledger] = await Promise.all([
    getStock(variantId).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    getLedger({ variantId, cursor, limit: 25 }),
  ]);
  const canAdjust = can(me, 'inventory:adjust');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-muted hover:text-text">
          ← Inventory
        </Link>
        <h1 className="mt-2 text-h1">{stock.productName}</h1>
        <p className="mt-1 text-sm text-muted">
          {stock.label && <>{stock.label} · </>}SKU <span className="font-mono">{stock.sku}</span> ·{' '}
          <Link href={`/admin/products/${stock.productId}`} className="hover:underline">
            Edit product
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">On hand</p>
          <p className="mt-1 text-h1 tabular">{stock.onHand}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Status</p>
          <p className="mt-2">
            <StatusBadge status={stock.status} />
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Low-stock alert at</p>
          <p className="mt-1 text-h2 tabular">
            {stock.threshold}{' '}
            {stock.lowStockThreshold === null && (
              <span className="text-sm font-normal text-muted">(store default)</span>
            )}
          </p>
        </Card>
      </div>

      {canAdjust && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h2 className="text-h3">Adjust stock</h2>
            <p className="mt-1 text-sm text-muted">
              Every change is recorded below with your name. Orders adjust stock automatically.
            </p>
            <ActionForm
              action={adjustStockAction.bind(null, variantId)}
              submitLabel="Record change"
              className="mt-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field id="delta" label="Change in units" hint="e.g. 24 or -2">
                  <Input
                    id="delta"
                    name="delta"
                    type="number"
                    step={1}
                    inputMode="numeric"
                    required
                    hasHint
                  />
                </Field>
                <Field id="reason" label="Reason">
                  <Select id="reason" name="reason" required defaultValue="">
                    <option value="" disabled>
                      Choose a reason
                    </option>
                    {REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field id="note" label="Note" optional>
                <Input
                  id="note"
                  name="note"
                  maxLength={200}
                  placeholder="Supplier invoice, count sheet…"
                />
              </Field>
            </ActionForm>
          </Card>
          <Card>
            <h2 className="text-h3">Alert level</h2>
            <p className="mt-1 text-sm text-muted">
              Flag as low at or below this many units. Leave empty for the store default (
              {DEFAULT_LOW_STOCK_THRESHOLD}).
            </p>
            <ActionForm
              action={setThresholdAction.bind(null, variantId)}
              submitLabel="Save"
              size="sm"
              className="mt-4"
              inline
            >
              <Field id="lowStockThreshold" label="Units">
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  defaultValue={stock.lowStockThreshold ?? ''}
                  placeholder={String(DEFAULT_LOW_STOCK_THRESHOLD)}
                  className="w-28"
                />
              </Field>
            </ActionForm>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="text-h3">History</h2>
        <div className="mt-4">
          <LedgerTable items={ledger.items} />
        </div>
        {ledger.nextCursor && (
          <Link
            href={`/admin/inventory/${variantId}?cursor=${encodeURIComponent(ledger.nextCursor)}`}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Older entries →
          </Link>
        )}
      </Card>
    </div>
  );
}
