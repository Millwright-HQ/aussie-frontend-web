import type { Brand, CategoryNode, ProductDetail } from '@aussie/shared-types';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { Alert, Badge, buttonVariants, PageHeader, Panel } from '@/app/admin/_ui';
import { DeleteProduct } from '../delete-product';
import { DuplicateProduct } from '../duplicate-product';
import { MediaManager } from '../media-manager';
import { ProductEditor } from '../product-editor';
import { StockPanel } from './stock-panel';

export const metadata = { title: 'Edit product' };

const STATUS = {
  ACTIVE: { tone: 'success', label: 'Active' },
  DRAFT: { tone: 'warning', label: 'Draft' },
  ARCHIVED: { tone: 'neutral', label: 'Archived' },
} as const;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const me = await requirePermission('product:read');
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) notFound();

  let product: ProductDetail;
  try {
    product = await api<ProductDetail>('admin', `/v1/catalog/admin/products/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [brands, categories, definitions]: [
    Brand[],
    CategoryNode[],
    Awaited<ReturnType<typeof getDefinitions>>,
  ] = await Promise.all([getBrands(), getCategoryTree(), getDefinitions()]);
  const editable = can(me, 'product:write');
  const showStock = can(me, 'inventory:read');
  const status = STATUS[product.status];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/products', label: 'Products' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        description={`${product.variants.length} variant${product.variants.length === 1 ? '' : 's'} · ${brands.find((b) => b.id === product.brandId)?.name ?? 'No brand'}`}
        actions={
          <>
            {editable && <DuplicateProduct productId={product.id} />}
            {product.status === 'ACTIVE' && (
              <Link
                href={`/p/${product.slug}`}
                target="_blank"
                className={buttonVariants({ variant: 'outline' })}
              >
                View on store <ExternalLink aria-hidden size={14} />
              </Link>
            )}
          </>
        }
      />

      {created && (
        <Alert tone="success">
          Product created as a draft. Set its opening stock below, add images, then set it to Active
          to publish.
        </Alert>
      )}
      {!editable && <Alert tone="info">You can view products but not change them.</Alert>}

      {showStock && <StockPanel product={product} canAdjust={can(me, 'inventory:adjust')} />}

      {editable ? (
        <>
          <MediaManager
            productId={product.id}
            images={product.images}
            variants={product.variants}
          />
          <ProductEditor
            product={product}
            brands={brands}
            categories={categories}
            attributeDefs={definitions.attributes}
            optionDefs={definitions.options}
          />
          {product.status !== 'ACTIVE' && (
            <Panel
              title="Danger zone"
              description="A product on the store cannot be deleted: archive it instead."
            >
              <DeleteProduct productId={product.id} name={product.name} />
            </Panel>
          )}
        </>
      ) : (
        <Panel title="Details">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted">Status</dt>
            <dd>{product.status}</dd>
            <dt className="text-muted">Brand</dt>
            <dd>{brands.find((b) => b.id === product.brandId)?.name ?? '—'}</dd>
            <dt className="text-muted">Variants</dt>
            <dd>
              {product.variants
                .map((v) => [v.sku, ...v.options.map((o) => o.value)].join(' · '))
                .join(', ')}
            </dd>
            <dt className="text-muted">Images</dt>
            <dd>{product.images.length}</dd>
          </dl>
        </Panel>
      )}
    </div>
  );
}
