import type { CategoryNode, ProductPage, PublicSite } from '@aussie/shared-types';
import { buttonVariants } from '@aussie/ui';
import { Banknote, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { getCategoryTree, listProducts } from '@/lib/catalog';
import { getSite, sitePictureUrl } from '@/lib/content';
import { HeroSlider } from './_components/hero-slider';
import Image from 'next/image';
import { ProductCard } from './_components/product-card';
import { ProductRail } from './_components/product-rail';

export default async function HomePage() {
  const [categories, newest, site]: [CategoryNode[], ProductPage | null, PublicSite] =
    await Promise.all([
      getCategoryTree().catch(() => []),
      listProducts({ sort: 'newest', pageSize: 8 }).catch(() => null),
      getSite(),
    ]);
  const { home } = site.settings;
  const { banners } = site;
  const slides = banners.map((b) => ({ ...b, src: sitePictureUrl(b.imagePath) }));

  return (
    <>
      {slides.length > 0 ? (
        <>
          <h1 className="sr-only">{site.settings.storeName}</h1>
          <HeroSlider banners={slides} />
        </>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <p className="text-xs font-medium tracking-[0.04em] text-accent-text uppercase">
            Welcome
          </p>
          <h1 className="max-w-2xl text-display">Everything you need, delivered to your door.</h1>
          <p className="max-w-xl text-lg text-muted">
            {site.settings.tagline ??
              'Shop beauty, fashion, home, electronics and food. Delivered anywhere in Sri Lanka.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className={buttonVariants({ size: 'lg' })}>
              Shop all products
            </Link>
            <Link href="/track" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Track an order
            </Link>
          </div>
        </section>
      )}

      {home.showCategories && categories.length > 0 && (
        <section
          aria-labelledby="shop-by-category"
          className="mx-auto max-w-7xl px-4 pt-12 pb-12 md:px-6 md:pt-16 md:pb-16 lg:px-8"
        >
          <h2 id="shop-by-category" className="text-center text-h2">
            Featured collection
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="group block text-center">
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-muted">
                    {c.imagePath ? (
                      <Image
                        unoptimized
                        src={sitePictureUrl(c.imagePath)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-full items-center justify-center font-display text-4xl font-semibold text-muted"
                      >
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-sm font-medium group-hover:underline">
                    {c.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {home.showNewIn && newest && newest.items.length > 0 && (
        <section
          aria-labelledby="new-in"
          className="mx-auto max-w-7xl px-4 pb-12 md:px-6 md:pb-16 lg:px-8"
        >
          <h2 id="new-in" className="text-center text-h2">
            New &amp; trending
          </h2>
          <div className="mt-8">
            <ProductRail label="New and trending products">
              {newest.items.map((p, i) => (
                <ProductCard key={p.id} p={p} priority={i < 4} />
              ))}
            </ProductRail>
          </div>
          <p className="mt-6 text-center">
            <Link href="/shop" className="text-sm font-medium underline underline-offset-4">
              View all products
            </Link>
          </p>
        </section>
      )}

      {home.showTrustBar && (
        <section aria-label="Why shop with us" className="border-y border-border bg-surface">
          <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 md:px-6 lg:px-8">
            <Trust icon={<Banknote aria-hidden strokeWidth={1.5} />} title="Pay your way">
              Cash on delivery or bank transfer.
            </Trust>
            <Trust icon={<Truck aria-hidden strokeWidth={1.5} />} title="Island-wide delivery">
              All 25 districts covered.
            </Trust>
            <Trust icon={<ShieldCheck aria-hidden strokeWidth={1.5} />} title="Genuine products">
              Sourced directly from trusted suppliers.
            </Trust>
          </ul>
        </section>
      )}
    </>
  );
}

function Trust({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-secondary-text">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-sm text-muted">{children}</span>
      </span>
    </li>
  );
}
