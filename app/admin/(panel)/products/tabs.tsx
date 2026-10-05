import { can } from '@/lib/admin';
import type { AdminMe } from '@/lib/admin';
import { SectionTabs } from '@/app/admin/_ui';

/** Pages of the Products section: products, and the brands and categories they use. */
export function ProductTabs({
  me,
  current,
  counts,
}: {
  me: AdminMe;
  current: string;
  counts?: { products?: number; brands?: number; categories?: number };
}) {
  const items = [
    ...(can(me, 'product:read')
      ? [{ href: '/admin/products', label: 'Products', count: counts?.products }]
      : []),
    ...(can(me, 'category:write')
      ? [
          { href: '/admin/products/brands', label: 'Brands', count: counts?.brands },
          { href: '/admin/products/categories', label: 'Categories', count: counts?.categories },
        ]
      : []),
  ];
  return <SectionTabs items={items} current={current} />;
}
