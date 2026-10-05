import type { ADJUSTMENT_REASONS, ProductDetail } from '@aussie/shared-types';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@aussie/shared-types';
import { ulidSchema } from '@aussie/validation';
import { Pencil } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { imageUrl } from '@/lib/media';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { adjustStockAction, setThresholdAction } from '@/app/admin/(panel)/products/stock/actions';
import { LedgerTable, StatusBadge } from '@/app/admin/(panel)/products/stock/parts';
import { getLedger, getStock } from '@/app/admin/(panel)/products/stock/stock';
import {
  Badge,
  buttonVariants,
  Field,
  formatLkr,
  Input,
  PageHeader,
  Pager,
  Panel,
  Select,
  Stat,
} from '@/app/admin/_ui';

export const metadata = { title: 'Stock' };

const REASON_OPTIONS = [
  { value: 'RECEIVED', label: 'Received (add units)' },
  { value: 'RETURNED', label: 'Customer return (add units)' },
  { value: 'DAMAGED', label: 'Damaged / lost (negative number)' },
  { value: 'CORRECTION', label: 'Stock count correction (either direction)' },
] as const satisfies readonly { value: (typeof ADJUSTMENT_REASONS)[number]; label: string }[];

export default async function VariantStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; variantId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const me = await requirePermission('inventory:read');
  const [{ id, variantId }, { cursor }] = await Promise.all([params, searchParams]);
  if (!ulidSchema.safeParse(variantId).success || !ulidSchema.safeParse(id).success) notFound();

  const [stock, ledger, product] = await Promise.all([
    getStock(variantId).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    getLedger({ variantId, cursor, limit: 25 }),
    api<ProductDetail>('admin', `/v1/catalog/admin/products/${id}`).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
  ]);
  if (stock.productId !== product.id) notFound();
  const canAdjust = can(me, 'inventory:adjust');
  const cover = product.images.find((i) => i.status === 'READY');
  const variant = product.variants.find((v) => v.id === variantId);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/admin/products/${product.id}`, label: product.name }}
        title={stock.label || 'Stock'}
        description={
          <>
            SKU <span className="font-mono">{stock.sku}</span> · {product.name}
          </>
        }
        actions={
          can(me, 'product:write') ? (
            <Link href={`/admin/products/${product.id}`} className={buttonVariants({ variant: 'outline' })}>
              <Pencil aria-hidden size={14} /> Edit product details
            </Link>
          ) : undefined
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-surface-muted">
            {cover && (
              <Image src={imageUrl(cover.base)} alt="" fill sizes="64px" className="object-cover" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{product.name}</p>
            <p className="text-[13px] text-muted">
              {product.status === 'ACTIVE' ? 'On the store' : product.status === 'DRAFT' ? 'Draft' : 'Archived'}
              {variant && ` · ${formatLkr(variant.priceCents)}`}
              {` · ${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {product.variants.length > 1 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Other variants">
              {product.variants.map((v) => (
                <Link
                  key={v.id}
                  href={`/admin/products/${product.id}/stock/${v.id}`}
                  aria-current={v.id === variantId ? 'page' : undefined}
                  className="rounded-full border border-border px-3 py-1 text-[13px] text-muted hover:text-text aria-[current=page]:border-primary aria-[current=page]:bg-primary/10 aria-[current=page]:text-text"
                >
                  {v.options.map((o) => o.value).join(' · ') || v.sku}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="On hand" value={stock.onHand} />
        <Stat label="Status" value={<StatusBadge status={stock.status} />} />
        <Stat
          label="Low-stock alert at"
          value={stock.threshold}
          note={stock.lowStockThreshold === null ? <Badge>store default</Badge> : undefined}
        />
      </div>

      {canAdjust && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Panel
            title="Adjust stock"
            description="Every change is recorded below with your name. Orders adjust stock automatically."
          >
            <ActionForm
              action={adjustStockAction.bind(null, variantId)}
              submitLabel="Record change"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field id="delta" label="Change in units" hint="e.g. 24 or -2">
                  <Input id="delta" name="delta" type="number" step={1} inputMode="numeric" required hasHint />
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
                <Input id="note" name="note" maxLength={200} placeholder="Supplier invoice, count sheet…" />
              </Field>
            </ActionForm>
          </Panel>
          <Panel
            title="Alert level"
            description={`Flag as low at or below this many units. Leave empty for the store default (${DEFAULT_LOW_STOCK_THRESHOLD}).`}
            className="self-start"
          >
            <ActionForm action={setThresholdAction.bind(null, variantId)} submitLabel="Save" size="sm" inline>
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
          </Panel>
        </div>
      )}

      <Panel title="History" flush>
        <LedgerTable items={ledger.items} />
      </Panel>
      <Pager
        prev={cursor ? `/admin/products/${product.id}/stock/${variantId}` : undefined}
        next={
          ledger.nextCursor
            ? `/admin/products/${product.id}/stock/${variantId}?cursor=${encodeURIComponent(ledger.nextCursor)}`
            : undefined
        }
      />
    </div>
  );
}
