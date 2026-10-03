import type { Brand } from '@aussie/shared-types';
import { Card, Field, Input } from '@aussie/ui';
import { requirePermission } from '@/lib/admin';
import { getBrands } from '@/lib/catalog';
import { ActionForm } from '../action-form';
import { deleteTaxonomyAction, saveBrandAction } from '../catalog/actions';

export const metadata = { title: 'Brands' };

function BrandForm({ brand }: { brand?: Brand }) {
  const key = brand?.id ?? 'new';
  return (
    <ActionForm action={saveBrandAction} submitLabel={brand ? 'Save' : 'Add brand'} size="sm">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`bname-${key}`} label="Name">
          <Input
            id={`bname-${key}`}
            name="name"
            defaultValue={brand?.name}
            required
            maxLength={60}
          />
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

function Remove({ id, label }: { id: string; label: string }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-danger">Delete…</summary>
      <ActionForm
        action={deleteTaxonomyAction}
        submitLabel={`Delete ${label}`}
        variant="danger"
        size="sm"
        className="mt-2"
      >
        <input type="hidden" name="kind" value="brand" />
        <input type="hidden" name="id" value={id} />
      </ActionForm>
    </details>
  );
}

export default async function BrandsPage() {
  await requirePermission('category:write');
  const brands = await getBrands();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1">Brands</h1>
        <p className="mt-1 text-muted">
          Optional: a product can have a brand or none. Shoppers can filter by brand.
        </p>
      </div>
      <Card>
        <BrandForm />
      </Card>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface">
        {brands.length === 0 && <li className="p-4 text-sm text-muted">No brands yet.</li>}
        {brands.map((b) => (
          <li key={b.id} className="p-4">
            <details>
              <summary className="cursor-pointer">
                <span className="font-medium">{b.name}</span>
                {b.countryOfOrigin && (
                  <span className="text-sm text-muted"> · {b.countryOfOrigin}</span>
                )}
              </summary>
              <div className="mt-3 space-y-3">
                <BrandForm brand={b} />
                <Remove id={b.id} label={b.name} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
