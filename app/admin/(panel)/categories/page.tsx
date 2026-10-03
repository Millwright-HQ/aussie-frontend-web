import { type Category, MAX_CATEGORY_DEPTH } from '@aussie/shared-types';
import { Card, Field, Input, Select } from '@aussie/ui';
import { categoryDepth, descendantIds, subtreeHeight } from '@aussie/validation';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { flattenTree } from '@/lib/editor-model';
import { ActionForm } from '../action-form';
import { deleteTaxonomyAction, saveCategoryAction } from '../catalog/actions';
import { ImageUploader } from '../site/image-uploader';

export const metadata = { title: 'Categories' };

/** Indentation by depth (fixed class names so Tailwind can see them). */
const INDENT = ['pl-0', 'pl-6', 'pl-12', 'pl-[4.5rem]', 'pl-24'];

/** "Beauty › Makeup" for the parent picker. */
function pathOf(all: Category[], id: string) {
  const names: string[] = [];
  let current = all.find((c) => c.id === id);
  while (current && names.length < MAX_CATEGORY_DEPTH) {
    names.unshift(current.name);
    const parentId: string | null = current.parentId;
    current = parentId ? all.find((c) => c.id === parentId) : undefined;
  }
  return names.join(' › ');
}

function CategoryForm({ category, all }: { category?: Category; all: Category[] }) {
  const key = category?.id ?? 'new';
  // A parent must leave room for this category (and everything below it) within the depth limit,
  // and cannot be the category itself or one of its own sub-categories.
  const own = category ? descendantIds(all, category.id) : new Set<string>();
  const height = category ? subtreeHeight(all, category.id) : 1;
  const parents = all.filter(
    (c) => !own.has(c.id) && categoryDepth(all, c.id) + height <= MAX_CATEGORY_DEPTH,
  );
  return (
    <ActionForm
      action={saveCategoryAction}
      submitLabel={category ? 'Save' : 'Add category'}
      size="sm"
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`name-${key}`} label="Name">
          <Input
            id={`name-${key}`}
            name="name"
            defaultValue={category?.name}
            required
            maxLength={60}
          />
        </Field>
        <Field id={`parent-${key}`} label="Parent">
          <Select id={`parent-${key}`} name="parentId" defaultValue={category?.parentId ?? ''}>
            <option value="">— Top level —</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {pathOf(all, c.id)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`slug-${key}`} label="URL name" optional>
          <Input id={`slug-${key}`} name="slug" defaultValue={category?.slug} placeholder="auto" />
        </Field>
        <Field id={`order-${key}`} label="Order" hint="Lower shows first">
          <Input
            id={`order-${key}`}
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={category?.sortOrder ?? 0}
            hasHint
          />
        </Field>
      </div>
      <ImageUploader
        name="imagePath"
        label="Home page picture (optional)"
        initialPath={category?.imagePath}
        previewUrlBase={process.env.NEXT_PUBLIC_CDN_URL ?? ''}
      />
    </ActionForm>
  );
}

function DeleteForm({ id, label }: { id: string; label: string }) {
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
        <input type="hidden" name="kind" value="category" />
        <input type="hidden" name="id" value={id} />
      </ActionForm>
    </details>
  );
}

export default async function CategoriesPage() {
  await requirePermission('category:write');
  const [tree, defs] = await Promise.all([getCategoryTree(), getDefinitions()]);
  const flat = flattenTree(tree);
  const all: Category[] = flat.map((f) => f.node);
  const countOf = (id: string) =>
    defs.attributes.filter((a) => a.categoryId === id).length +
    defs.options.filter((o) => o.categoryId === id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Categories</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Up to {MAX_CATEGORY_DEPTH} levels deep. Each category can ask for its own details (like
          RAM or skin type) and variant options (like colour or size); everything below it inherits
          them. Products can sit in several categories.
        </p>
      </div>
      <Card>
        <h2 className="text-h3">Add a category</h2>
        <div className="mt-4">
          <CategoryForm all={all} />
        </div>
      </Card>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface">
        {flat.map(({ node, depth }) => (
          <li key={node.id} className={`p-4 ${INDENT[Math.min(depth, INDENT.length) - 1]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={depth === 1 ? 'font-medium' : undefined}>
                {node.name} <span className="text-xs text-muted">/c/{node.slug}</span>
              </span>
              <Link
                href={`/admin/categories/${node.id}`}
                className="text-sm font-medium whitespace-nowrap text-primary hover:underline"
              >
                Fields & options ({countOf(node.id)})
              </Link>
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-muted">Edit or delete</summary>
              <div className="mt-3 space-y-3">
                <CategoryForm category={node} all={all} />
                <DeleteForm id={node.id} label={node.name} />
              </div>
            </details>
          </li>
        ))}
        {flat.length === 0 && <li className="p-4 text-sm text-muted">No categories yet.</li>}
      </ul>
    </div>
  );
}
