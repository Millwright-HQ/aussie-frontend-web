import Link from 'next/link';
import { can, requirePermission } from '@/lib/admin';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { Alert, PageHeader } from '@/app/admin/_ui';
import { ProductEditor } from '../product-editor';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const me = await requirePermission('product:write');
  const [brands, categories, definitions] = await Promise.all([
    getBrands(),
    getCategoryTree(),
    getDefinitions(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/products', label: 'Products' }}
        title="New product"
        description="Fill in the details, set the opening stock at the bottom, then add images on the next page."
      />
      {categories.length === 0 && (
        <Alert tone="info">
          Add a category first in{' '}
          <Link href="/admin/products/categories" className="font-medium underline">
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
        canSetStock={can(me, 'inventory:adjust')}
      />
    </div>
  );
}
