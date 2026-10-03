import type { ProductSummary } from '@aussie/shared-types';
import { formatLkr, Swatch } from '@aussie/ui';
import Image from 'next/image';
import Link from 'next/link';
import { imageUrl } from '@/lib/media';
import { Stars } from './stars';

/** "18% off", or undefined when there is no real saving. */
export function percentOff(price: number, compareAt?: number): number | undefined {
  if (!compareAt || compareAt <= price) return undefined;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct >= 1 ? pct : undefined;
}

export function PriceLine({
  min,
  max,
  compareAt,
  className = '',
}: {
  min: number;
  max: number;
  compareAt?: number;
  className?: string;
}) {
  const off = percentOff(min, compareAt);
  return (
    <p className={`tabular ${className}`}>
      <span className={`font-semibold ${off ? 'text-danger' : 'text-text'}`}>
        {min !== max && <span className="font-normal text-muted">From </span>}
        {formatLkr(min)}
      </span>
      {compareAt && off && (
        <>
          {' '}
          <s className="text-sm text-muted" aria-label={`was ${formatLkr(compareAt)}`}>
            {formatLkr(compareAt)}
          </s>
          <span className="ml-1 text-xs font-medium text-danger">{off}% off</span>
        </>
      )}
    </p>
  );
}

/** Whole card is one link (docs/DESIGN_GUIDELINES.md §8). */
export function ProductCard({ p, priority }: { p: ProductSummary; priority?: boolean }) {
  const off = percentOff(p.minPriceCents, p.compareAtCents);
  return (
    <Link
      href={`/p/${p.slug}`}
      className="group flex h-full flex-col rounded-md border border-border bg-surface p-3 text-center transition-colors hover:border-text"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-surface">
        {p.cover && (
          <Image
            src={imageUrl(p.cover.base)}
            alt={p.cover.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={`object-contain transition-transform duration-300 ease-brand group-hover:scale-[1.03] ${p.soldOut ? 'opacity-50' : ''}`}
          />
        )}
        {p.soldOut ? (
          <span className="absolute top-0 left-0 rounded-sm bg-text px-2 py-0.5 text-xs font-medium text-bg">
            Sold out
          </span>
        ) : (
          off && (
            <span className="absolute top-0 left-0 rounded-sm border border-danger px-2 py-0.5 text-xs font-medium text-danger">
              {off}% off
            </span>
          )
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col items-center space-y-1">
        {p.brandName && <p className="text-xs tracking-wide text-muted uppercase">{p.brandName}</p>}
        <h3 className="line-clamp-2 font-sans text-sm font-medium text-text group-hover:underline sm:text-base">
          {p.name}
        </h3>
        {p.rating && <Stars value={p.rating.average} count={p.rating.count} />}
        <PriceLine min={p.minPriceCents} max={p.maxPriceCents} compareAt={p.compareAtCents} />
        {p.swatches.length > 1 && (
          <p className="flex items-center gap-1" aria-label={`${p.swatches.length} shades`}>
            {p.swatches.slice(0, 5).map((s) => (
              <Swatch key={s.hex} hex={s.hex} title={s.name} />
            ))}
            {p.swatches.length > 5 && (
              <span className="text-xs text-muted">+{p.swatches.length - 5}</span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}
