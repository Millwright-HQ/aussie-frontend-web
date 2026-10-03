'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Sidebar links that tell assistive technology (and sighted users) which page is open. */
export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {items.map((n) => {
        const current = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current ? 'page' : undefined}
            className="rounded-sm px-3 py-2 text-sm whitespace-nowrap text-text hover:bg-surface-muted aria-[current=page]:bg-surface-muted aria-[current=page]:font-medium"
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
