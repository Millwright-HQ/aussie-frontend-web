import type { Brand, CategoryNode, ProductDetail } from '@aussie/shared-types';
import { Alert } from '@aussie/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { MediaManager } from '../media-manager';
import { ProductEditor } from '../product-editor';
import { DeleteProduct } from '../delete-product';
import { DuplicateProduct } from '../duplicate-product';

export const metadata = { title: 'Edit product' };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="text-sm text-muted hover:text-text">
            ← Products
          </Link>
          <h1 className="text-h1">{product.name}</h1>
        </div>
        {product.status === 'ACTIVE' && (
          <Link
            href={`/p/${product.slug}`}
            target="_blank"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            View on store ↗
          </Link>
        )}
      </div>
      {created && (
        <Alert tone="success">
          Product created as a draft. Add images, then set it to Active to publish.
        </Alert>
      )}
      {!editable && <Alert tone="info">You can view products but not change them.</Alert>}
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
          <DuplicateProduct productId={product.id} />
          {product.status !== 'ACTIVE' && (
            <DeleteProduct productId={product.id} name={product.name} />
          )}
        </>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 rounded-md border border-border bg-surface p-6 text-sm sm:grid-cols-[160px_1fr]">
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
      )}
    </div>
  );
}
