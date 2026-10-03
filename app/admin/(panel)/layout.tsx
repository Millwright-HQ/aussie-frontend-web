import type { Permission } from '@aussie/shared-types';
import { Button } from '@aussie/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { can, currentAdmin } from '@/lib/admin';
import { readTheme } from '@/lib/theme';
import { signOut } from '../login/actions';
import { AdminNav } from './admin-nav';

const NAV: { href: string; label: string; permission?: Permission }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders', permission: 'order:read' },
  { href: '/admin/products', label: 'Products', permission: 'product:read' },
  { href: '/admin/inventory', label: 'Inventory', permission: 'inventory:read' },
  { href: '/admin/reviews', label: 'Reviews', permission: 'review:read' },
  { href: '/admin/delivery', label: 'Delivery', permission: 'delivery:read' },
  { href: '/admin/payments', label: 'Payments', permission: 'order:read' },
  { href: '/admin/site', label: 'Site settings', permission: 'content:write' },
  { href: '/admin/banners', label: 'Banners', permission: 'content:write' },
  { href: '/admin/pages', label: 'Pages', permission: 'content:write' },
  { href: '/admin/categories', label: 'Categories', permission: 'category:write' },
  { href: '/admin/brands', label: 'Brands', permission: 'category:write' },
  { href: '/admin/admins', label: 'Admins', permission: 'admin:manage' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/admin/customers', label: 'Customers', permission: 'customer:read' },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit:read' },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await currentAdmin();
  const items = NAV.filter((n) => !n.permission || can(me, n.permission));
  const mode = await readTheme('admin', 'dark');

  return (
    <div className="md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3"
      >
        Skip to content
      </a>
      <aside className="border-b border-border bg-surface print:hidden md:min-h-[calc(100dvh-24px)] md:w-60 md:border-r md:border-b-0">
        <div className="px-5 py-5">
          <p className="font-display text-lg font-semibold">Aussie Admin</p>
        </div>
        <AdminNav items={items} />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end print:hidden gap-4 border-b border-border px-6 py-3 text-sm">
          <ThemeToggle scope="admin" initial={mode} />
          <span className="text-muted">
            {me.name} · <span className="font-medium text-text">{me.roleId}</span>
          </span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-6xl px-6 py-8 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
