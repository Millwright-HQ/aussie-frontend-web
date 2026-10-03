import type { AttributeFacet, ProductPage } from '@aussie/shared-types';
import { parseAttributeFilter } from '@aussie/validation';
import { Button } from '@aussie/ui';
import Link from 'next/link';
import { attrToSearchParams, type ListingParams } from '@/lib/catalog';
import { ProductCard } from './product-card';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

/** Builds a URL for this listing with some params changed (used for pagination links). */
function hrefWith(basePath: string, p: ListingParams, patch: Partial<ListingParams>) {
  const merged = { ...p, ...patch };
  const qs = new URLSearchParams();
  if (merged.brand?.length) qs.set('brand', merged.brand.join(','));
  attrToSearchParams(merged.attr, qs);
  const scalars: [string, string | undefined][] = [
    ['minPrice', merged.minPrice],
    ['maxPrice', merged.maxPrice],
    ['q', merged.q],
    ['sort', merged.sort],
    ['page', merged.page],
  ];
  for (const [k, v] of scalars) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Product grid with a filter form. The form is a plain GET form, so filtering works without
 * JavaScript and every filtered view has a shareable URL.
 */
export function Listing({
  page,
  params,
  basePath,
}: {
  page: ProductPage;
  params: ListingParams;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const filtered = Boolean(
    params.brand?.length || params.attr?.length || params.minPrice || params.maxPrice,
  );
  const selected = selectedFilters(params.attr);

  return (
    <div className="gap-10 lg:flex">
      <aside className="mb-8 lg:mb-0 lg:w-60 lg:shrink-0">
        <details
          className="group rounded-md border border-border bg-surface lg:border-0 lg:bg-transparent"
          open
        >
          <summary className="cursor-pointer px-4 py-3 font-medium lg:hidden">
            Filter & sort
          </summary>
          <form action={basePath} method="get" className="space-y-6 p-4 lg:p-0">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            <div>
              <label htmlFor="sort" className="mb-2 block text-sm font-medium">
                Sort by
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={params.sort ?? 'newest'}
                className="block min-h-11 w-full rounded-sm border border-border bg-surface px-3"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {page.facets.brands.length > 0 && (
              <FacetGroup
                legend="Brand"
                name="brand"
                options={page.facets.brands}
                selected={params.brand}
              />
            )}
            {page.facets.attributes.map((f) => (
              <AttributeFilter key={f.key} facet={f} selected={selected.get(f.key)} />
            ))}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Price (Rs)</legend>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="minPrice">
                  Minimum price
                </label>
                <input
                  id="minPrice"
                  name="minPrice"
                  inputMode="numeric"
                  placeholder="Min"
                  defaultValue={params.minPrice}
                  className="min-h-11 w-full rounded-sm border border-border bg-surface px-3"
                />
                <span aria-hidden>–</span>
                <label className="sr-only" htmlFor="maxPrice">
                  Maximum price
                </label>
                <input
                  id="maxPrice"
                  name="maxPrice"
                  inputMode="numeric"
                  placeholder="Max"
                  defaultValue={params.maxPrice}
                  className="min-h-11 w-full rounded-sm border border-border bg-surface px-3"
                />
              </div>
            </fieldset>
            <div className="flex items-center gap-3">
              <Button type="submit" className="flex-1">
                Apply
              </Button>
              {filtered && (
                <Link
                  href={hrefWith(basePath, { q: params.q, sort: params.sort }, {})}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </details>
      </aside>

      <section className="min-w-0 flex-1" aria-live="polite">
        <p className="mb-4 text-sm text-muted">
          {page.total} product{page.total === 1 ? '' : 's'}
        </p>
        {page.items.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-10 text-center">
            <p className="font-medium">No products match.</p>
            <p className="mt-1 text-sm text-muted">Try removing a filter.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {page.items.map((p, i) => (
              <li key={p.id}>
                <ProductCard p={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-4 text-sm">
            {page.page > 1 && (
              <Link href={hrefWith(basePath, params, { page: String(page.page - 1) })}>
                ← Previous
              </Link>
            )}
            <span className="text-muted">
              Page {page.page} of {totalPages}
            </span>
            {page.page < totalPages && (
              <Link href={hrefWith(basePath, params, { page: String(page.page + 1) })}>Next →</Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

function FacetGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: { slug: string; name: string; count: number }[];
  selected?: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.slug}>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name={name}
                value={o.slug}
                defaultChecked={selected?.includes(o.slug)}
                className="size-5 accent-primary"
              />
              <span className="flex-1">{o.name}</span>
              <span className="text-xs text-muted">{o.count}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

type Selected = { values: string[]; min?: string; max?: string };

/** The attribute filters currently applied, by attribute key. */
function selectedFilters(attr: string[] | undefined): Map<string, Selected> {
  const out = new Map<string, Selected>();
  for (const raw of attr ?? []) {
    const f = parseAttributeFilter(raw);
    if (!f) continue;
    out.set(
      f.key,
      f.kind === 'values'
        ? { values: f.values }
        : { values: [], min: f.min?.toString(), max: f.max?.toString() },
    );
  }
  return out;
}

/** One filter generated from a category's attribute: checkboxes for choices, min/max for numbers. */
function AttributeFilter({ facet, selected }: { facet: AttributeFacet; selected?: Selected }) {
  if (facet.type === 'number') {
    return (
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          {facet.label}
          {facet.unit ? ` (${facet.unit})` : ''}
        </legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`fmin-${facet.key}`}>
            {facet.label} minimum
          </label>
          <input
            id={`fmin-${facet.key}`}
            name={`fmin.${facet.key}`}
            inputMode="decimal"
            placeholder={facet.min === undefined ? 'Min' : String(facet.min)}
            defaultValue={selected?.min}
            className="min-h-11 w-full rounded-sm border border-border bg-surface px-3"
          />
          <span aria-hidden>–</span>
          <label className="sr-only" htmlFor={`fmax-${facet.key}`}>
            {facet.label} maximum
          </label>
          <input
            id={`fmax-${facet.key}`}
            name={`fmax.${facet.key}`}
            inputMode="decimal"
            placeholder={facet.max === undefined ? 'Max' : String(facet.max)}
            defaultValue={selected?.max}
            className="min-h-11 w-full rounded-sm border border-border bg-surface px-3"
          />
        </div>
      </fieldset>
    );
  }
  return (
    <FacetGroup
      legend={facet.label}
      name={`f.${facet.key}`}
      options={(facet.values ?? []).map((v) => ({ slug: v.value, name: v.label, count: v.count }))}
      selected={selected?.values}
    />
  );
}
