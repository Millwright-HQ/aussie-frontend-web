import type { Category, CategoryNode } from '@aussie/shared-types';
import { descendantIds } from '@aussie/validation';
import { ChevronRight, FolderTree, Settings2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { requirePermission } from '@/lib/admin';
import { getBrands, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { flattenTree } from '@/lib/editor-model';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { deleteTaxonomyAction, saveCategoryAction } from '@/app/admin/(panel)/catalog/actions';
import { ImageUploader } from '@/app/admin/(panel)/site/image-uploader';
import {
  ConfirmAction,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
} from '@/app/admin/_ui';
import { ProductTabs } from '../tabs';

export const metadata = { title: 'Categories' };

/** "Beauty › Makeup" for the parent picker. Stops if the data ever loops. */
function pathOf(all: Category[], id: string) {
  const names: string[] = [];
  const seen = new Set<string>();
  let current = all.find((c) => c.id === id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    const parentId: string | null = current.parentId;
    current = parentId ? all.find((c) => c.id === parentId) : undefined;
  }
  return names.join(' › ');
}

function CategoryForm({ category, all }: { category?: Category | undefined; all: Category[] }) {
  const key = category?.id ?? 'new';
  // A category cannot be moved under itself or one of its own sub-categories. There is no limit
  // on how deep the tree goes.
  const own = category ? descendantIds(all, category.id) : new Set<string>();
  const parents = all.filter((c) => !own.has(c.id));
  return (
    <ActionForm
      action={saveCategoryAction}
      submitLabel={category ? 'Save changes' : 'Add category'}
      size="sm"
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
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

/** One category and, nested under it, its children, to any depth. */
function Branch({
  node,
  all,
  countOf,
  depth = 0,
}: {
  node: CategoryNode;
  all: Category[];
  countOf: (id: string) => number;
  depth?: number;
}) {
  const kids = node.children.length;
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-2 hover:bg-surface-muted/60">
          <ChevronRight
            aria-hidden
            size={15}
            className="shrink-0 text-muted transition-transform group-open:rotate-90"
          />
          <span className="min-w-0 flex-1">
            <span className={depth === 0 ? 'font-semibold' : 'font-medium'}>{node.name}</span>
            <span className="ml-2 text-xs text-muted">/c/{node.slug}</span>
            {kids > 0 && (
              <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-muted tabular">
                {kids} below
              </span>
            )}
          </span>
          <Link
            href={`/admin/products/categories/${node.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] text-muted hover:bg-surface-muted hover:text-text"
          >
            <Settings2 aria-hidden size={14} /> Fields &amp; options
            <span className="tabular">({countOf(node.id)})</span>
          </Link>
        </summary>
        <div className="ml-[9px] border-l border-border pl-4">
          <div className="space-y-4 py-3">
            <CategoryForm category={node} all={all} />
            <ConfirmAction
              action={deleteTaxonomyAction}
              fields={{ kind: 'category', id: node.id }}
              title={`Delete ${node.name}?`}
              description={
                kids > 0
                  ? 'It still has sub-categories. Move or delete them first, or this will be refused.'
                  : 'Products in this category stay, but are no longer listed under it.'
              }
              confirmLabel="Delete category"
              variant="danger-soft"
            >
              <Trash2 aria-hidden size={14} /> Delete category
            </ConfirmAction>
          </div>
          {kids > 0 && (
            <ul className="space-y-0.5 pb-2">
              {node.children.map((c) => (
                <Branch key={c.id} node={c} all={all} countOf={countOf} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

export default async function CategoriesPage() {
  const me = await requirePermission('category:write');
  const [tree, defs, brands] = await Promise.all([
    getCategoryTree(),
    getDefinitions(),
    getBrands().catch(() => []),
  ]);
  const flat = flattenTree(tree);
  const all: Category[] = flat.map((f) => f.node);
  const countOf = (id: string) =>
    defs.attributes.filter((a) => a.categoryId === id).length +
    defs.options.filter((o) => o.categoryId === id).length;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Categories can nest as deep as you need. Each one can ask for its own details (like RAM or skin type) and variant options (like colour or size); everything below it inherits them. A product can sit in several categories."
      />
      <ProductTabs
        me={me}
        current="/admin/products/categories"
        counts={{ brands: brands.length, categories: all.length }}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title="Category tree" description={`${all.length} categories. Open one to edit it.`}>
          {tree.length === 0 ? (
            <EmptyState icon={<FolderTree size={20} />} title="No categories yet">
              Add your first category with the form.
            </EmptyState>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {tree.map((n) => (
                <Branch key={n.id} node={n} all={all} countOf={countOf} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Add a category" className="self-start">
          <CategoryForm all={all} />
        </Panel>
      </div>
    </div>
  );
}
