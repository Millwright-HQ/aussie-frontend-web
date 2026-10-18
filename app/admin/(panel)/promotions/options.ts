import 'server-only';
import type { CategoryNode } from '@aussie/shared-types';
import { api } from '@/lib/api';
import { getCategoryTree } from '@/lib/catalog';
import type { PickOption } from './promotion-fields';

function flatten(nodes: CategoryNode[], trail: string[] = []): PickOption[] {
  return nodes.flatMap((n) => {
    const path = [...trail, n.name];
    return [{ id: n.id, label: path.join(' › ') }, ...flatten(n.children, path)];
  });
}

/** Everything a promotion can be aimed at: categories (with their full path) and products. */
export async function loadPickOptions(): Promise<{
  categories: PickOption[];
  products: PickOption[];
}> {
  const [tree, list] = await Promise.all([
    getCategoryTree(),
    api<{ items: { id: string; name: string; status: string }[] }>(
      'admin',
      '/v1/catalog/admin/products',
    ),
  ]);
  return {
    categories: flatten(tree).sort((a, b) => a.label.localeCompare(b.label)),
    products: list.items
      .filter((p) => p.status !== 'ARCHIVED')
      .map((p) => ({ id: p.id, label: p.status === 'DRAFT' ? `${p.name} (draft)` : p.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
