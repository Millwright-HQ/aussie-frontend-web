import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listingParams, listProducts } from '@/lib/catalog';
import { Listing } from '../_components/listing';

export const metadata: Metadata = { title: 'Shop all' };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = listingParams(await searchParams);
  const page = await listProducts(params);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
      <h1 className="text-h1">{params.q ? `Results for “${params.q}”` : 'Shop all'}</h1>
      <form action="/shop" method="get" role="search" className="mt-4 mb-8 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <input
          id="q"
          name="q"
          defaultValue={params.q}
          placeholder="Search products or brands"
          className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-3"
        />
        <button
          type="submit"
          className="min-h-11 rounded-sm bg-primary px-4 text-sm font-medium text-primary-fg"
        >
          Search
        </button>
      </form>
      <Listing page={page} params={params} basePath="/shop" />
    </div>
  );
}
