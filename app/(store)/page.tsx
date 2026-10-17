import type { Brand, CategoryNode, ProductPage, PublicSite } from '@aussie/shared-types';
import { buttonVariants } from '@aussie/ui';
import { Banknote, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { getBrands, getCategoryTree, listProducts } from '@/lib/catalog';
import { getSite, sitePictureUrl } from '@/lib/content';
import { STORE_NAME } from '@/lib/site';
import { BrandMarquee } from './_components/brand-marquee';
import { HeroSlider } from './_components/hero-slider';
import Image from 'next/image';
import { Reveal } from '@/components/reveal';
import { MobilePager } from './_components/mobile-pager';
import { ProductCard } from './_components/product-card';

export default async function HomePage() {
  const [categories, newest, site, allBrands]: [
    CategoryNode[],
    ProductPage | null,
    PublicSite,
    Brand[],
  ] = await Promise.all([
    getCategoryTree().catch(() => []),
    listProducts({ sort: 'newest', pageSize: 8 }).catch(() => null),
    getSite(),
    getBrands().catch(() => []),
  ]);
  const { home } = site.settings;
  const tiles = featuredTiles(categories, home.featured);
  const brands = allBrands.filter((b): b is Brand & { logoPath: string } => !!b.logoPath);
  const { banners } = site;
  const slides = banners.map((b) => ({
    ...b,
    src: sitePictureUrl(b.imagePath),
    ...(b.mobileImagePath ? { mobileSrc: sitePictureUrl(b.mobileImagePath) } : {}),
  }));

  return (
    <>
      {slides.length > 0 ? (
        <>
          <h1 className="sr-only">{STORE_NAME}</h1>
          <HeroSlider banners={slides} />
        </>
      ) : (
        <section className="hero-welcome mx-auto grid max-w-7xl gap-8 px-4 py-16 md:px-6 md:py-24 lg:px-8">
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

      {home.showCategories && tiles.length > 0 && (
        <section
          aria-labelledby="shop-by-category"
          className="mx-auto max-w-7xl px-4 pt-12 pb-12 md:px-6 md:pt-16 md:pb-16 lg:px-8"
        >
          <Reveal className="title-rule">
            <h2 id="shop-by-category" className="text-center text-h2">
              Featured collection
            </h2>
          </Reveal>
          <div className="mt-8">
            <MobilePager
              label="collections"
              listClassName="flex flex-wrap justify-center gap-4"
              items={tiles.map(({ category: c, imagePath }) => ({
                key: c.id,
                className:
                  'w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.7rem)] lg:w-[calc(16.666%-0.85rem)]',
                node: (
                  <Link href={`/c/${c.slug}`} className="group block text-center">
                    <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-muted">
                      {imagePath ? (
                        <Image
                          unoptimized
                          src={sitePictureUrl(imagePath)}
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
                    <span className="mt-3 block text-lg font-semibold group-hover:underline md:text-xl">
                      {c.name}
                    </span>
                  </Link>
                ),
              }))}
            />
          </div>
        </section>
      )}

      {home.showNewIn && newest && newest.items.length > 0 && (
        <section
          aria-labelledby="new-in"
          className="mx-auto max-w-7xl px-4 pb-12 md:px-6 md:pb-16 lg:px-8"
        >
          <Reveal className="title-rule">
            <h2 id="new-in" className="text-center text-h2">
              New &amp; trending
            </h2>
          </Reveal>
          <div className="mt-8">
            <MobilePager
              label="products"
              listClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
              items={newest.items.map((p, i) => ({
                key: p.id,
                node: <ProductCard p={p} priority={i < 4} />,
              }))}
            />
          </div>
          <Reveal variant="scale" delay={150} className="mt-8 text-center">
            <Link href="/shop" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              View all products
            </Link>
          </Reveal>
        </section>
      )}

      {home.showBrands && brands.length > 0 && (
        <section aria-labelledby="our-brands" className="pb-12 md:pb-16">
          <Reveal className="title-rule">
            <h2 id="our-brands" className="text-center text-h2">
              Our brands
            </h2>
          </Reveal>
          <Reveal variant="fade" className="mt-6">
            <BrandMarquee brands={brands} />
          </Reveal>
        </section>
      )}

      {home.showTrustBar && (
        <section aria-label="Why shop with us" className="border-y border-border bg-surface">
          <Reveal
            as="ul"
            stagger
            className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 md:px-6 lg:px-8"
          >
            <Trust icon={<Banknote aria-hidden strokeWidth={1.5} />} title="Pay your way">
              Cash on delivery or bank transfer.
            </Trust>
            <Trust icon={<Truck aria-hidden strokeWidth={1.5} />} title="Island-wide delivery">
              All 25 districts covered.
            </Trust>
            <Trust icon={<ShieldCheck aria-hidden strokeWidth={1.5} />} title="Genuine products">
              Sourced directly from trusted suppliers.
            </Trust>
          </Reveal>
        </section>
      )}

      {home.showAbout && home.aboutBody.trim() && (
        <section aria-labelledby="about-store" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          {home.aboutHeading.trim() && (
            <h2 id="about-store" className="text-center text-h2">
              {home.aboutHeading}
            </h2>
          )}
          <Reveal delay={100} className="mt-4 space-y-4 text-center text-muted">
            {home.aboutBody
              .split(/\n{2,}/)
              .filter((para) => para.trim())
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </Reveal>
        </section>
      )}
    </>
  );
}

/** The tiles for the Featured collection: the owner's chosen categories, or every top-level one. */
function featuredTiles(
  tree: CategoryNode[],
  chosen: { categoryId: string; imagePath?: string | undefined }[],
): { category: CategoryNode; imagePath: string | undefined }[] {
  const byId = new Map<string, CategoryNode>();
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      byId.set(n.id, n);
      walk(n.children);
    }
  };
  walk(tree);
  const picked = chosen.flatMap((t) => {
    const category = byId.get(t.categoryId); // a deleted category simply drops out
    return category ? [{ category, imagePath: t.imagePath ?? category.imagePath }] : [];
  });
  return picked.length > 0
    ? picked
    : tree.map((category) => ({ category, imagePath: category.imagePath }));
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
