import type { Brand } from '@aussie/shared-types';
import { buttonVariants, formatLkr } from '@aussie/ui';
import Image from 'next/image';
import Link from 'next/link';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { getBrands } from '@/lib/catalog';
import { imageUrl } from '@/lib/media';

export const metadata = { title: 'Products' };

interface Row {
  id: string;
  name: string;
  slug: string;
  brandId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  minPriceCents: number;
  maxPriceCents: number;
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

const STATUS_STYLE = {
  ACTIVE: 'text-success',
  DRAFT: 'text-warning',
  ARCHIVED: 'text-muted',
} as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const me = await requirePermission('product:read');
  const sp = await searchParams;
  const status = STATUSES.find((s) => s.key && s.key === sp.status)?.key;
  const [{ items }, brands] = await Promise.all([
    api<{ items: Row[] }>(
      'admin',
      `/v1/catalog/admin/products${status ? `?status=${status}` : ''}`,
    ),
    getBrands(),
  ]);
  const brandName = new Map(brands.map((b: Brand) => [b.id, b.name]));
  const q = (sp.q ?? '').trim().toLowerCase().slice(0, 60);
  const rows = q
    ? items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          brandName
            .get(r.brandId ?? '')
            ?.toLowerCase()
            .includes(q),
      )
    : items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Products</h1>
          <p className="mt-1 text-muted">
            {items.length} product{items.length === 1 ? '' : 's'}
          </p>
        </div>
        {can(me, 'product:write') && (
          <Link href="/admin/products/new" className={buttonVariants()}>
            New product
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={s.key ? `/admin/products?status=${s.key}` : '/admin/products'}
            aria-current={(status ?? '') === s.key ? 'page' : undefined}
            className="rounded-full border border-border px-3 py-1 text-sm aria-[current=page]:bg-surface-muted aria-[current=page]:font-medium"
          >
            {s.label}
          </Link>
        ))}
        <form className="ml-auto" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <input
            id="q"
            name="q"
            defaultValue={sp.q}
            placeholder="Search name or brand"
            className="min-h-9 rounded-sm border border-border bg-surface px-3 text-sm"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Variants</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                      {r.cover && (
                        <Image
                          src={imageUrl(r.cover.base)}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span>
                      <span className="block font-medium">{r.name}</span>
                      <span className="text-muted">{brandName.get(r.brandId ?? '') ?? '—'}</span>
                    </span>
                  </Link>
                </td>
                <td className={`px-4 py-3 ${STATUS_STYLE[r.status]}`}>
                  {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                </td>
                <td className="px-4 py-3 tabular">
                  {formatLkr(r.minPriceCents)}
                  {r.maxPriceCents !== r.minPriceCents && ` – ${formatLkr(r.maxPriceCents)}`}
                </td>
                <td className="px-4 py-3">{r.variantCount}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
