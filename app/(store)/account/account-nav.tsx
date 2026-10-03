import Link from 'next/link';
import { signOutAction } from './actions';

const LINKS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/reviews', label: 'Reviews' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/security', label: 'Password' },
];

export function AccountLayout({
  current,
  children,
}: {
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-h1">My account</h1>
      <div className="mt-8 gap-10 md:flex">
        <nav
          aria-label="Account"
          className="mb-8 flex gap-2 overflow-x-auto md:mb-0 md:w-48 md:flex-col"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === current ? 'page' : undefined}
              className="rounded-sm px-3 py-2 text-sm whitespace-nowrap hover:bg-surface-muted aria-[current=page]:bg-surface-muted aria-[current=page]:font-medium"
            >
              {l.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-sm px-3 py-2 text-left text-sm whitespace-nowrap text-muted hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
