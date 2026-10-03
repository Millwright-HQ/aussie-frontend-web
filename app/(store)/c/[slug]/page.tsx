import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryTrail, getCategoryTree, listingParams, listProducts } from '@/lib/catalog';
import { Listing } from '../../_components/listing';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The category with the trail of ancestors above it (any depth). */
async function findCategory(slug: string) {
  const trail = categoryTrail(await getCategoryTree(), (c) => c.slug === slug);
  const category = trail.at(-1);
  return category ? { category, ancestors: trail.slice(0, -1) } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findCategory((await params).slug);
  return { title: found?.category.name ?? 'Category' };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const found = await findCategory(slug);
  if (!found) notFound();
  const query = listingParams(await searchParams);
  const page = await listProducts({ ...query, category: slug });
  if (!page) notFound();
  const { category, ancestors } = found;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="hover:text-text">
              Home
            </Link>{' '}
            /
          </li>
          {ancestors.map((a) => (
            <li key={a.id}>
              <Link href={`/c/${a.slug}`} className="hover:text-text">
                {a.name}
              </Link>{' '}
              /
            </li>
          ))}
          <li aria-current="page" className="text-text">
            {category.name}
          </li>
        </ol>
      </nav>
      <h1 className="mt-2 text-h1">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-muted">{category.description}</p>}
      {category.children.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.slug}`}
                className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-muted"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <Listing page={page} params={query} basePath={`/c/${slug}`} />
      </div>
    </div>
  );
}
