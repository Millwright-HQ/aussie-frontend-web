import type { Brand } from '@aussie/shared-types';
import { Pencil, Tag, Trash2 } from 'lucide-react';
import { requirePermission } from '@/lib/admin';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { deleteTaxonomyAction, saveBrandAction } from '@/app/admin/(panel)/catalog/actions';
import {
  ConfirmAction,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
} from '@/app/admin/_ui';
import { ProductTabs } from '../tabs';

export const metadata = { title: 'Brands' };

function BrandForm({ brand }: { brand?: Brand | undefined }) {
  const key = brand?.id ?? 'new';
  return (
    <ActionForm action={saveBrandAction} submitLabel={brand ? 'Save changes' : 'Add brand'} size="sm">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`bname-${key}`} label="Name">
          <Input id={`bname-${key}`} name="name" defaultValue={brand?.name} required maxLength={60} />
        </Field>
        <Field id={`bcountry-${key}`} label="Country" optional>
          <Input
            id={`bcountry-${key}`}
            name="countryOfOrigin"
            defaultValue={brand?.countryOfOrigin}
            maxLength={60}
          />
        </Field>
        <Field id={`bslug-${key}`} label="URL name" optional>
          <Input id={`bslug-${key}`} name="slug" defaultValue={brand?.slug} placeholder="auto" />
        </Field>
      </div>
    </ActionForm>
  );
}

export default async function BrandsPage() {
  const me = await requirePermission('category:write');
  const [brands, tree] = await Promise.all([getBrands(), getCategoryTree().catch(() => [])]);
  const catCount = (function count(nodes: typeof tree): number {
    return nodes.reduce((n, c) => n + 1 + count(c.children), 0);
  })(tree);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Brands are optional: a product can have one or none, and shoppers can filter by brand."
      />
      <ProductTabs
        me={me}
        current="/admin/products/brands"
        counts={{ brands: brands.length, categories: catCount }}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="All brands" flush>
          {brands.length === 0 ? (
            <EmptyState icon={<Tag size={20} />} title="No brands yet">
              Add the first one with the form.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {brands.map((b) => (
                <li key={b.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{b.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {b.countryOfOrigin ?? 'No country'} · /{b.slug}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-muted group-open:text-primary">
                        <Pencil aria-hidden size={15} />
                        <span className="text-[13px]">Edit</span>
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-border bg-surface-muted/30 px-5 py-4">
                      <BrandForm brand={b} />
                      <ConfirmAction
                        action={deleteTaxonomyAction}
                        fields={{ kind: 'brand', id: b.id }}
                        title={`Delete ${b.name}?`}
                        description="Products that use this brand keep working but will show no brand."
                        confirmLabel="Delete brand"
                        variant="danger-soft"
                      >
                        <Trash2 aria-hidden size={14} /> Delete brand
                      </ConfirmAction>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Add a brand" className="self-start">
          <BrandForm />
        </Panel>
      </div>
    </div>
  );
}
