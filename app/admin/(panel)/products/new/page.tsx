import { Alert } from '@aussie/ui';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { ProductEditor } from '../product-editor';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  await requirePermission('product:write');
  const [brands, categories, definitions] = await Promise.all([
    getBrands(),
    getCategoryTree(),
    getDefinitions(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-muted hover:text-text">
          ← Products
        </Link>
        <h1 className="text-h1">New product</h1>
      </div>
      {categories.length === 0 && (
        <Alert tone="info">
          Add a category first in{' '}
          <Link href="/admin/categories" className="underline">
            Categories
          </Link>
          .
        </Alert>
      )}
      <ProductEditor
        brands={brands}
        categories={categories}
        attributeDefs={definitions.attributes}
        optionDefs={definitions.options}
      />
    </div>
  );
}
