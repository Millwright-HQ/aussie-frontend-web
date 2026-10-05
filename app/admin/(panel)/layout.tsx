import type { Permission } from '@aussie/shared-types';
import { ExternalLink, LogOut, Mail, UserRound } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { can, currentAdmin } from '@/lib/admin';
import { readTheme } from '@/lib/theme';
import { signOut } from '../login/actions';
import { Avatar, ConfirmSubmit } from '../_ui';
import { AdminShell, type NavGroup } from './shell';

interface Def {
  href: string;
  label: string;
  permission?: Permission;
}
interface ItemDef extends Def {
  icon: NavGroup['items'][number]['icon'];
  /** Without children the item is a plain link. */
  children?: Def[];
}

/**
 * Parent > child structure of the admin (owner decision 2026-10-05). A parent opens its first
 * page the signed-in admin may see; a parent with nothing visible is hidden.
 */
const GROUPS: { label?: string; items: ItemDef[] }[] = [
  { items: [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: 'orders', permission: 'order:read' },
      {
        href: '/admin/customers',
        label: 'Customers',
        icon: 'customers',
        permission: 'customer:read',
      },
      { href: '/admin/reviews', label: 'Reviews', icon: 'reviews', permission: 'review:read' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      {
        href: '/admin/products',
        label: 'Products',
        icon: 'products',
        children: [
          { href: '/admin/products', label: 'All products', permission: 'product:read' },
          { href: '/admin/products/brands', label: 'Brands', permission: 'category:write' },
          { href: '/admin/products/categories', label: 'Categories', permission: 'category:write' },
        ],
      },
    ],
  },
  {
    label: 'Store',
    items: [
      {
        href: '/admin/site',
        label: 'Site settings',
        icon: 'settings',
        children: [
          { href: '/admin/site', label: 'General', permission: 'content:write' },
          { href: '/admin/site/banners', label: 'Banners', permission: 'content:write' },
          { href: '/admin/site/pages', label: 'Pages', permission: 'content:write' },
          {
            href: '/admin/site/delivery',
            label: 'Delivery configuration',
            permission: 'delivery:read',
          },
          {
            href: '/admin/site/payments',
            label: 'Payment configuration',
            permission: 'order:read',
          },
        ],
      },
    ],
  },
  {
    label: 'Team',
    items: [
      { href: '/admin/admins', label: 'Admins', icon: 'admins', permission: 'admin:manage' },
      { href: '/admin/roles', label: 'Roles', icon: 'roles' },
      { href: '/admin/audit', label: 'Audit log', icon: 'audit', permission: 'audit:read' },
    ],
  },
];

const roleName = (id: string) =>
  id
    .replace(/^custom-.*/, 'Custom role')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await currentAdmin();
  const mode = await readTheme('admin', 'dark');
  const allowed = (d: Def) => !d.permission || can(me, d.permission);

  const groups: NavGroup[] = GROUPS.map((g) => ({
    ...(g.label ? { label: g.label } : {}),
    items: g.items.flatMap((item) => {
      if (!item.children)
        return allowed(item) ? [{ href: item.href, label: item.label, icon: item.icon }] : [];
      const kids = item.children.filter(allowed);
      const first = kids[0];
      return first
        ? [
            {
              href: first.href,
              label: item.label,
              icon: item.icon,
              children: kids.map(({ href, label }) => ({ href, label })),
            },
          ]
        : [];
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <AdminShell
      groups={groups}
      brand={
        <Link href="/admin" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-[9px] bg-primary text-sm font-bold text-primary-fg"
          >
            A
          </span>
          Aussie Admin
        </Link>
      }
      topbar={
        <>
          {process.env.NEXT_PUBLIC_ENV_NAME === 'local' && (
            <Link
              href="/dev/mail"
              target="_blank"
              className="mr-1 inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-muted hover:bg-surface-muted hover:text-text"
            >
              <Mail aria-hidden size={14} /> Local mail
            </Link>
          )}
          <Link
            href="/"
            target="_blank"
            className="mr-1 inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-muted hover:bg-surface-muted hover:text-text"
          >
            View store <ExternalLink aria-hidden size={14} />
          </Link>
          <ThemeToggle
            scope="admin"
            initial={mode}
            className="inline-flex size-9 items-center justify-center rounded-[10px] text-muted hover:bg-surface-muted hover:text-text"
          />
        </>
      }
      footer={
        <div>
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar name={me.name} {...(me.avatar ? { src: me.avatar } : {})} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me.name}</p>
              <p className="truncate text-xs text-muted">{roleName(me.roleId)}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Link
              href="/admin/profile"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] bg-surface-muted text-[13px] font-medium hover:bg-border"
            >
              <UserRound aria-hidden size={14} /> Profile
            </Link>
            <form action={signOut} className="contents">
              <ConfirmSubmit
                title="Sign out of Aussie Admin?"
                description="You will need to sign in again to continue. This sign-out is recorded in the audit log."
                confirmLabel="Sign out"
                triggerVariant="secondary"
                triggerClassName="w-full text-[13px]"
                icon={<LogOut aria-hidden size={14} />}
              >
                Sign out
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      }
    >
      {children}
    </AdminShell>
  );
}
