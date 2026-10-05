import { can } from '@/lib/admin';
import type { AdminMe } from '@/lib/admin';
import { SectionTabs } from '@/app/admin/_ui';

/** Pages of Site settings: how the store looks, what it says, how it delivers and gets paid. */
export function SiteTabs({ me, current }: { me: AdminMe; current: string }) {
  const items = [
    ...(can(me, 'content:write')
      ? [
          { href: '/admin/site', label: 'General' },
          { href: '/admin/site/banners', label: 'Banners' },
          { href: '/admin/site/pages', label: 'Pages' },
        ]
      : []),
    ...(can(me, 'delivery:read')
      ? [{ href: '/admin/site/delivery', label: 'Delivery configuration' }]
      : []),
    ...(can(me, 'order:read')
      ? [{ href: '/admin/site/payments', label: 'Payment configuration' }]
      : []),
  ];
  return <SectionTabs items={items} current={current} />;
}
