import type { CategoryNode } from '@aussie/shared-types';
import { Menu, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { BrandIcon, type BrandName } from '@/components/brand-icons';
import { NewsletterForm } from '@/components/newsletter-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { FloatingActions } from './_components/floating-actions';
import { cartCount, getCart } from '@/lib/cart';
import { getCategoryTree } from '@/lib/catalog';
import { getSite } from '@/lib/content';
import { DEFAULT_CONTACT_EMAIL, STORE_NAME } from '@/lib/site';
import { readTheme } from '@/lib/theme';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // The header must render even if the catalog API is briefly unavailable.
  const categories: CategoryNode[] = await getCategoryTree().catch(() => []);
  const bagCount = cartCount(await getCart());
  const site = await getSite();
  const { settings } = site;
  const mode = await readTheme('store', settings.theme.defaultMode);
  const storeName = STORE_NAME;
  // Information pages, grouped for the footer: help, company, and the legal line at the very bottom.
  const inGroup = (slugs: string[]) => site.pages.filter((p) => slugs.includes(p.slug));
  const care = inGroup(['delivery', 'returns', 'contact']);
  const company = inGroup(['about']);
  const legal = inGroup(['terms', 'privacy']);
  const contactEmail = settings.email ?? DEFAULT_CONTACT_EMAIL;
  const whatsappDigits = settings.whatsapp?.replace(/\D/g, '');
  const socials: { name: BrandName; label: string; href: string }[] = [
    { name: 'instagram' as const, label: 'Instagram', href: settings.instagram },
    { name: 'facebook' as const, label: 'Facebook', href: settings.facebook },
    { name: 'tiktok' as const, label: 'TikTok', href: settings.tiktok },
    { name: 'youtube' as const, label: 'YouTube', href: settings.youtube },
    {
      name: 'whatsapp' as const,
      label: 'WhatsApp',
      href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : '',
    },
  ].flatMap((x) => (x.href ? [{ ...x, href: x.href }] : []));

  return (
    <div
      data-theme-root="store"
      data-theme={mode}
      className="flex min-h-dvh flex-col bg-bg text-text"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3"
      >
        Skip to content
      </a>
      {settings.announcement.enabled && settings.announcement.text && (
        <div className="bg-text text-bg">
          <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs tracking-wide uppercase md:px-6 lg:px-8">
            {settings.announcement.href ? (
              <a href={settings.announcement.href} className="underline-offset-4 hover:underline">
                {settings.announcement.text}
              </a>
            ) : (
              settings.announcement.text
            )}
          </p>
        </div>
      )}
      <header className="relative border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <details className="relative lg:hidden">
                <summary
                  aria-label="Shop categories"
                  className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface-muted"
                >
                  <Menu aria-hidden size={20} strokeWidth={1.5} />
                </summary>
                <nav
                  aria-label="Categories"
                  className="absolute top-12 left-0 z-40 max-h-[70dvh] w-72 overflow-y-auto rounded-md border border-border bg-surface p-4 shadow-md"
                >
                  <Link href="/shop" className="block py-2 font-medium">
                    Shop all
                  </Link>
                  {categories.map((c) => (
                    <MobileNode key={c.id} node={c} />
                  ))}
                </nav>
              </details>
            )}
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-xl font-semibold text-text"
            >
              <BrandLogo />
            </Link>
          </div>
          <form
            action="/shop"
            method="get"
            role="search"
            className="hidden max-w-md flex-1 md:block"
          >
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search
                aria-hidden
                size={18}
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                id="header-search"
                name="q"
                type="search"
                placeholder="Search products or brands"
                className="min-h-11 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-sm"
              />
            </div>
          </form>
          <nav aria-label="Account and cart" className="flex items-center gap-1">
            <span className="md:hidden">
              <IconLink href="/shop" label="Search products">
                <Search aria-hidden size={20} strokeWidth={1.5} />
              </IconLink>
            </span>
            <ThemeToggle scope="store" initial={mode} />
            <IconLink href="/account" label="Account">
              <User aria-hidden size={20} strokeWidth={1.5} />
            </IconLink>
            <IconLink href="/cart" label={bagCount ? `Bag, ${bagCount} items` : 'Bag'}>
              <span className="relative">
                <ShoppingBag aria-hidden size={20} strokeWidth={1.5} />
                {bagCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-2 -right-2 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-fg"
                  >
                    {bagCount}
                  </span>
                )}
              </span>
            </IconLink>
          </nav>
        </div>
        {categories.length > 0 && (
          <nav aria-label="Categories" className="hidden border-t border-border lg:block">
            <ul className="mx-auto flex max-w-7xl gap-1 px-4 md:px-6 lg:px-8">
              <li>
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-text/75 transition-colors hover:text-text"
                >
                  Shop all
                </Link>
              </li>
              {/*
                Hover opens a full-width panel and leaving closes it. A click does nothing, so
                the panel never stays open. Keyboard users get it with Tab (focus-visible only).
                A category with nothing below it is a plain link.
              */}
              {categories.map((c) => (
                <li key={c.id} className="group">
                  {c.children.length > 0 ? (
                    <>
                      <button
                        type="button"
                        aria-haspopup="true"
                        className="inline-flex min-h-11 cursor-default items-center px-3 text-sm font-medium text-text/75 transition-colors group-hover:text-text group-has-[:focus-visible]:text-text"
                      >
                        {c.name}
                      </button>
                      <DesktopMenu node={c} />
                    </>
                  ) : (
                    <Link
                      href={`/c/${c.slug}`}
                      className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-text/75 transition-colors hover:text-text"
                    >
                      {c.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <FloatingActions whatsapp={settings.whatsapp} storeName={storeName} />
      <footer className="border-t border-border bg-surface-muted text-sm text-muted">
        <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-4 py-10 md:px-6 lg:grid-cols-[1.2fr_2.6fr_1.4fr] lg:px-8">
          <div className="space-y-4">
            <Link href="/" aria-label={`${storeName} home`} className="inline-block">
              <BrandLogo height="h-8" />
            </Link>
            {settings.footerNote && <p>{settings.footerNote}</p>}
            <ul className="space-y-1">
              {settings.phone && (
                <li>
                  <a
                    href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
                    className="hover:text-text"
                  >
                    {settings.phone}
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${contactEmail}`} className="hover:text-text">
                  {contactEmail}
                </a>
              </li>
              {settings.address && <li>{settings.address}</li>}
            </ul>
            {socials.length > 0 && (
              <SocialLinks socials={socials} size={20} className="flex gap-4" />
            )}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            <FooterColumn title="Shop">
              <li>
                <Link href="/shop" className="hover:text-text">
                  All products
                </Link>
              </li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="hover:text-text">
                    {c.name}
                  </Link>
                </li>
              ))}
            </FooterColumn>
            <FooterColumn title="Customer care">
              <li>
                <Link href="/track" className="hover:text-text">
                  Track your order
                </Link>
              </li>
              {care.map((p) => (
                <li key={p.slug}>
                  <Link href={`/info/${p.slug}`} className="hover:text-text">
                    {p.title}
                  </Link>
                </li>
              ))}
            </FooterColumn>
            {company.length > 0 && (
              <FooterColumn title="Company">
                {company.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/info/${p.slug}`} className="hover:text-text">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </FooterColumn>
            )}
          </nav>

          <div>
            <h2 className="text-xs font-semibold tracking-wide text-text uppercase">
              Stay in the loop
            </h2>
            <p className="mt-3">New arrivals, offers and back-in-stock news. No spam.</p>
            <div className="mt-3">
              <NewsletterForm source="footer" />
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs md:flex-row md:px-6 lg:px-8">
            <p>
              © {new Date().getFullYear()} {storeName}
            </p>
            {legal.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                {legal.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/info/${p.slug}`} className="hover:text-text">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-text uppercase">{title}</h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

/** Brand icons as links; the words are there for screen readers and as the hover tooltip. */
function SocialLinks({
  socials,
  size,
  className,
}: {
  socials: { name: BrandName; label: string; href: string }[];
  size: number;
  className: string;
}) {
  return (
    <ul className={className} aria-label="Follow us">
      {socials.map((x) => (
        <li key={x.name}>
          <a
            href={x.href}
            target="_blank"
            rel="noopener noreferrer"
            title={x.label}
            className="inline-flex opacity-80 transition-opacity hover:opacity-100"
          >
            <BrandIcon name={x.name} width={size} height={size} />
            <span className="sr-only">{x.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Any depth: a folder with an "All …" link when it has children, a plain link otherwise. */
function MobileNode({ node, depth = 0 }: { node: CategoryNode; depth?: number }) {
  if (node.children.length === 0) {
    return (
      <Link href={`/c/${node.slug}`} className="block py-1.5 text-sm">
        {node.name}
      </Link>
    );
  }
  return (
    <details className={depth === 0 ? 'border-t border-border' : undefined}>
      <summary className={`cursor-pointer py-2 ${depth === 0 ? 'font-medium' : 'text-sm'}`}>
        {node.name}
      </summary>
      <div className="pb-2 pl-3">
        <Link href={`/c/${node.slug}`} className="block py-1.5 text-sm">
          All {node.name}
        </Link>
        {node.children.map((child) => (
          <MobileNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

/**
 * Mega menu: spans the whole header width and opens while the pointer (or focus) is on the
 * category, closing as soon as it leaves. The second level are headings with third-level links.
 */
function DesktopMenu({ node }: { node: CategoryNode }) {
  return (
    <div className="invisible absolute inset-x-0 top-full z-40 border-y border-border bg-surface opacity-0 shadow-md transition-opacity duration-150 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="mx-auto max-h-[70dvh] max-w-7xl overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
        <Link
          href={`/c/${node.slug}`}
          className="mb-4 inline-block text-sm font-semibold hover:text-primary"
        >
          All {node.name}
        </Link>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 xl:grid-cols-5">
          {node.children.map((s) => (
            <div key={s.id}>
              <Link
                href={`/c/${s.slug}`}
                className="block py-1 text-sm font-medium hover:text-primary"
              >
                {s.name}
              </Link>
              {s.children.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`/c/${t.slug}`}
                  className="block py-1 text-sm text-muted hover:text-text"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-text hover:bg-surface-muted"
    >
      {children}
    </Link>
  );
}
