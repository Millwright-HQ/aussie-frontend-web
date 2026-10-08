import type { Brand, CategoryNode, StockStatus } from '@aussie/shared-types';
import { ExternalLink, History, PackageSearch, Pencil, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { imageUrl } from '@/lib/media';
import {
  Badge,
  type BadgeTone,
  buttonVariants,
  EmptyState,
  formatLkr,
  IconLink,
  PageHeader,
  Pills,
  RowActions,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { StatusBadge } from './stock/parts';
import { listStock, type StockRow } from './stock/stock';
import { ProductTabs } from './tabs';

export const metadata = { title: 'Products' };

interface Row {
  id: string;
  name: string;
  slug: string;
  brandId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  minPriceCents: number;
  maxPriceCents: number;
  /** Range of the variants' cost prices; missing until a cost has been entered. */
  minCostCents?: number;
  maxCostCents?: number;
  variantCount: number;
  cover?: { base: string; alt: string };
  updatedAt: string;
}

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ARCHIVED', label: 'Archived' },
] as const;

const STATUS_TONE: Record<Row['status'], BadgeTone> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'neutral',
};
const STATUS_WORD: Record<Row['status'], string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
};

/** The worst state among a product's variants, and its total units. */
function stockOf(rows: StockRow[] | undefined) {
  if (!rows || rows.length === 0) return undefined;
  const live = rows.filter((r) => !r.removed);
  const rank = (st: StockStatus) => (st === 'out' ? 0 : st === 'low' ? 1 : 2);
  const worst = live.reduce<StockStatus>((w, r) => (rank(r.status) < rank(w) ? r.status : w), 'in');
  return { units: live.reduce((n, r) => n + r.onHand, 0), status: worst, variants: live.length };
}

const countTree = (nodes: CategoryNode[]): number =>
  nodes.reduce((n, c) => n + 1 + countTree(c.children), 0);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; stock?: string }>;
}) {
  const me = await requirePermission('product:read');
  const sp = await searchParams;
  const status = STATUSES.find((s) => s.key && s.key === sp.status)?.key;
  const lowOnly = sp.stock === 'low';
  const showStock = can(me, 'inventory:read');

  const [{ items }, brands, tree, stock] = await Promise.all([
    api<{ items: Row[] }>(
      'admin',
      `/v1/catalog/admin/products${status ? `?status=${status}` : ''}`,
    ),
    getBrands(),
    can(me, 'category:write') ? getCategoryTree().catch(() => []) : Promise.resolve([]),
    showStock ? listStock('all').catch(() => null) : Promise.resolve(null),
  ]);
  const brandName = new Map(brands.map((b: Brand) => [b.id, b.name]));
  const byProduct = new Map<string, StockRow[]>();
  for (const r of stock ?? [])
    byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), r]);

  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 60);
  let rows = q
    ? items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          brandName
            .get(r.brandId ?? '')
            ?.toLowerCase()
            .includes(q),
      )
    : items;
  if (lowOnly) rows = rows.filter((r) => (stockOf(byProduct.get(r.id))?.status ?? 'in') !== 'in');

  const link = (over: { status?: string; stock?: string }) => {
    const p = new URLSearchParams();
    const st = 'status' in over ? over.status : status;
    const sk = 'stock' in over ? over.stock : sp.stock;
    if (st) p.set('status', st);
    if (sk) p.set('stock', sk);
    if (sp.q) p.set('q', sp.q);
    const qs = p.toString();
    return qs ? `/admin/products?${qs}` : '/admin/products';
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything you sell, with live stock. Open a product to edit it and manage its stock in one place."
        actions={
          <>
            {showStock && (
              <Link
                href="/admin/products/stock-history"
                className={buttonVariants({ variant: 'outline' })}
              >
                <History aria-hidden size={16} /> Stock history
              </Link>
            )}
            {can(me, 'product:write') && (
              <Link href="/admin/products/new" className={buttonVariants()}>
                <Plus aria-hidden size={16} /> New product
              </Link>
            )}
          </>
        }
      />
      <ProductTabs
        me={me}
        current="/admin/products"
        counts={{ products: items.length, brands: brands.length, categories: countTree(tree) }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Pills
          current={status ?? ''}
          items={STATUSES.map((s) => ({
            key: s.key,
            label: s.label,
            href: link({ status: s.key }),
          }))}
        />
        {showStock && (
          <Pills
            current={lowOnly ? 'low' : ''}
            items={[
              { key: '', label: 'Any stock', href: link({ stock: '' }) },
              { key: 'low', label: 'Low & sold out', href: link({ stock: 'low' }) },
            ]}
          />
        )}
        <form className="relative ml-auto w-full sm:w-72" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          {lowOnly && <input type="hidden" name="stock" value="low" />}
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <Search
            aria-hidden
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            id="q"
            name="q"
            defaultValue={sp.q}
            placeholder="Search name or brand"
            className="h-10 w-full rounded-[10px] border border-border bg-surface pr-3 pl-9 text-sm shadow-sm"
          />
        </form>
      </div>

      <TableShell>
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Status</Th>
              {showStock && <Th>Stock</Th>}
              <Th>Price</Th>
              <Th>Cost</Th>
              <Th>Updated</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </Thead>
          <Tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showStock ? 7 : 6}>
                  <EmptyState
                    icon={<PackageSearch size={20} />}
                    title={q || status || lowOnly ? 'No products match' : 'No products yet'}
                    action={
                      !q && !status && !lowOnly && can(me, 'product:write') ? (
                        <Link href="/admin/products/new" className={buttonVariants()}>
                          Add your first product
                        </Link>
                      ) : undefined
                    }
                  >
                    {q || status || lowOnly
                      ? 'Try a different search or filter.'
                      : 'Products you add appear here.'}
                  </EmptyState>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const s = stockOf(byProduct.get(r.id));
              return (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-surface-muted">
                        {r.cover && (
                          <Image
                            src={imageUrl(r.cover.base)}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {brandName.get(r.brandId ?? '') ?? 'No brand'} · {r.variantCount} variant
                          {r.variantCount === 1 ? '' : 's'}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_WORD[r.status]}</Badge>
                  </Td>
                  {showStock && (
                    <Td>
                      {s ? (
                        <span className="flex items-center gap-2">
                          <span className="tabular font-medium">{s.units}</span>
                          <StatusBadge status={s.status} />
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                  )}
                  <Td className="tabular whitespace-nowrap">
                    {formatLkr(r.minPriceCents)}
                    {r.maxPriceCents !== r.minPriceCents && ` – ${formatLkr(r.maxPriceCents)}`}
                  </Td>
                  <Td className="tabular whitespace-nowrap">
                    {r.minCostCents === undefined ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <>
                        {formatLkr(r.minCostCents)}
                        {r.maxCostCents !== r.minCostCents &&
                          r.maxCostCents !== undefined &&
                          ` – ${formatLkr(r.maxCostCents)}`}
                      </>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(r.updatedAt)}</Td>
                  <Td>
                    <RowActions>
                      {r.status === 'ACTIVE' && (
                        <IconLink
                          label={`View ${r.name} on the store`}
                          href={`/p/${r.slug}`}
                          target="_blank"
                        >
                          <ExternalLink aria-hidden size={16} />
                        </IconLink>
                      )}
                      <IconLink label={`Edit ${r.name}`} href={`/admin/products/${r.id}`}>
                        <Pencil aria-hidden size={16} />
                      </IconLink>
                    </RowActions>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableShell>
    </div>
  );
}
