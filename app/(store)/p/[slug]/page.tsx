import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { deepestTrail, getCategoryTree, getProduct } from '@/lib/catalog';
import { availabilityLabel, availableUnits, getAvailability } from '@/lib/inventory';
import { ProductView } from './product-view';
import { getProductReviews } from '@/lib/reviews';
import { ReviewsSection } from './reviews-section';

type Props = { params: Promise<{ slug: string }> };

const validSlug = (s: string) => /^[a-z0-9-]{1,120}$/.test(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = validSlug(slug) ? await getProduct(slug) : null;
  if (!product) return { title: 'Product not found' };
  return { title: product.name, description: product.description.slice(0, 155) };
}

function Section({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="border-b border-border py-4">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  if (!validSlug(slug)) notFound();
  const [product, tree] = await Promise.all([getProduct(slug), getCategoryTree()]);
  if (!product) notFound();
  const availability = await getAvailability(product.id, { fresh: true });
  // Precomputed here: the client view must not import server-only modules.
  const stock = Object.fromEntries(
    product.variants.map((v) => {
      const a = availability ? (availability[v.id] ?? { status: 'out' as const }) : undefined;
      return [
        v.id,
        {
          out: a?.status === 'out',
          label: availabilityLabel(a),
          low: a?.status === 'low',
          max: availableUnits(a),
        },
      ];
    }),
  );

  const trail = deepestTrail(tree, product.categoryIds);
  // Short specs in one table; long text (ingredients, care instructions…) as sections of their own.
  const table = product.specs.filter((s) => !s.long);
  const sections = product.specs.filter((s) => s.long);
  const rows = [
    ...table.map((s) => [s.label, s.value] as const),
    ...(product.countryOfOrigin ? [['Country of origin', product.countryOfOrigin] as const] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="hover:text-text">
              Home
            </Link>{' '}
            {trail.length > 0 && '/'}
          </li>
          {trail.map((c, i) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="hover:text-text">
                {c.name}
              </Link>{' '}
              {i < trail.length - 1 && '/'}
            </li>
          ))}
        </ol>
      </nav>

      <ProductView
        productId={product.id}
        name={product.name}
        brandName={product.brandName}
        variants={product.variants}
        images={product.images}
        optionAxes={product.optionAxes}
        stock={stock}
        slug={slug}
        rating={(await getProductReviews(product.id))?.summary}
      />

      <div className="mt-12 max-w-3xl">
        {/* Plain text only (never HTML): safe to render content entered by admins. */}
        <Section title="Description" open>
          <p className="whitespace-pre-line">{product.description}</p>
        </Section>
        {product.highlights.length > 0 && (
          <Section title="Key features" open>
            <ul className="list-disc space-y-1 pl-5">
              {product.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </Section>
        )}
        {rows.length > 0 && (
          <Section title="Specifications" open>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>{k}</dt>
                  <dd className="text-text">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
        {sections.map((s) => (
          <Section key={s.key} title={s.label}>
            <p className="whitespace-pre-line">{s.value}</p>
          </Section>
        ))}
      </div>
      <ReviewsSection productId={product.id} slug={slug} />
    </div>
  );
}
