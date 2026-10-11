'use client';

import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Menu,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/app/admin/_ui';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customers: Users,
  reviews: Star,
  newsletter: Mail,
  products: Package,
  settings: Settings,
  admins: UserCog,
  roles: ShieldCheck,
  audit: ScrollText,
  pages: ClipboardList,
};

export interface NavChild {
  href: string;
  label: string;
}
export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  children?: NavChild[];
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** The most specific link (longest matching prefix) is the one that is "current". */
function currentOf(pathname: string, hrefs: string[]): string | undefined {
  let best: string | undefined;
  for (const h of hrefs) {
    const hit =
      h === '/admin' ? pathname === '/admin' : pathname === h || pathname.startsWith(`${h}/`);
    if (hit && (!best || h.length > best.length)) best = h;
  }
  return best;
}

function Nav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const all = groups.flatMap((g) =>
    g.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
  );
  const current = currentOf(pathname, all);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5 px-3 py-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">
              {g.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const childHrefs = item.children?.map((c) => c.href) ?? [];
              const inSection =
                current === item.href || (current !== undefined && childHrefs.includes(current));
              const expanded = item.children ? (open[item.href] ?? inSection) : false;
              const base =
                'flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-surface-muted';
              return (
                <li key={item.href}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={current === item.href ? 'page' : undefined}
                      className={cn(
                        base,
                        inSection ? 'font-medium text-text' : 'text-muted',
                        current === item.href && 'bg-primary/10 text-primary hover:bg-primary/15',
                      )}
                    >
                      <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    {item.children && (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label}`}
                        onClick={() => setOpen((o) => ({ ...o, [item.href]: !expanded }))}
                        className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface-muted hover:text-text"
                      >
                        <ChevronDown
                          aria-hidden
                          size={16}
                          className={cn('transition-transform', expanded && 'rotate-180')}
                        />
                      </button>
                    )}
                  </div>
                  {item.children && expanded && (
                    <ul className="mt-0.5 ml-[21px] space-y-0.5 border-l border-border pl-3">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            onClick={onNavigate}
                            aria-current={current === c.href ? 'page' : undefined}
                            className="block rounded-sm px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-muted hover:text-text aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Admin frame: a fixed sidebar on wide screens, a slide-over menu on phones. The server layout
 * passes in what depends on the signed-in admin (links they may see, the user card, sign out).
 */
export function AdminShell({
  groups,
  brand,
  footer,
  topbar,
  children,
}: {
  groups: NavGroup[];
  brand: ReactNode;
  footer: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">{brand}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Nav groups={groups} {...(onNavigate ? { onNavigate } : {})} />
      </div>
      <div className="shrink-0 border-t border-border p-3">{footer}</div>
    </div>
  );

  return (
    <div className="lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface print:hidden lg:block">
        {sidebar()}
      </aside>

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenu(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenu(false)}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface-muted"
            >
              <X aria-hidden size={18} />
            </button>
            {sidebar(() => setMenu(false))}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1 lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur lg:px-8 print:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenu(true)}
            className="flex size-9 items-center justify-center rounded-sm text-text hover:bg-surface-muted lg:hidden"
          >
            <Menu aria-hidden size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{topbar}</div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-[1400px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
