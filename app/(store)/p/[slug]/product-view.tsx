'use client';

import { Stars } from '../../_components/stars';
import type { ProductImage, ProductOptionAxis, Variant } from '@aussie/shared-types';
import { formatLkr, Swatch } from '@aussie/ui';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { imageUrl } from '@/lib/media';
import {
  axisValues,
  initialVariant,
  optionValue,
  pickVariant,
  valueUnavailable,
} from '@/lib/variant-select';
import { AddToBag } from './add-to-bag';
import { DeliveryBox, type DistrictChoice } from './delivery-box';

/** Images for the selected variant first, then shots shared by all variants. */
function imagesFor(images: ProductImage[], variantId: string) {
  const own = images.filter((i) => i.variantId === variantId);
  const shared = images.filter((i) => !i.variantId);
  const list = [...own, ...shared];
  return list.length ? list : images;
}

/** Per variant: sold out?, shopper text ("5 in stock", "Sold out"; empty = unknown), units on hand. */
export type StockView = Record<
  string,
  { out: boolean; low: boolean; label: string; max?: number | undefined }
>;

const STOCK_POLL_MS = 20_000;

/**
 * Keeps the stock on screen current: the server's numbers first, then a fresh read every 20s while
 * the tab is visible, when the tab is shown again, and when the browser restores the page from
 * its back/forward cache (which would otherwise bring back old numbers).
 */
function useLiveStock(productId: string, variants: Variant[], initial: StockView): StockView {
  const [stock, setStock] = useState(initial);
  useEffect(() => setStock(initial), [initial]);
  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/availability?productId=${encodeURIComponent(productId)}`, {
          cache: 'no-store',
        });
        if (!res.ok || stopped) return;
        const { variants: live } = (await res.json()) as { variants: StockView };
        if (stopped) return;
        setStock(
          Object.fromEntries(
            variants.map((v) => [
              v.id,
              live[v.id] ?? { out: true, low: false, label: 'Sold out', max: 0 },
            ]),
          ),
        );
      } catch {
        // Keep showing the last numbers.
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, STOCK_POLL_MS);
    const onShow = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('pageshow', onShow);
    void refresh();
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('pageshow', onShow);
    };
  }, [productId, variants]);
  return stock;
}

/** Diagonal strike over an unavailable option (CSS only; no inline styles under our CSP). */
function Strike() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-1 top-1/2 h-0.5 -rotate-45 rounded-full bg-text/70"
    />
  );
}

export function ProductView({
  productId,
  name,
  brandName,
  variants,
  images,
  optionAxes,
  stock: initialStock,
  slug,
  districts,
  rating,
}: {
  productId: string;
  name: string;
  brandName?: string;
  variants: Variant[];
  images: ProductImage[];
  optionAxes: ProductOptionAxis[];
  stock: StockView;
  slug: string;
  districts: DistrictChoice[];
  rating?: { average: number; count: number } | undefined;
}) {
  const stock = useLiveStock(productId, variants, initialStock);
  const isOut = (v: Variant) => Boolean(stock[v.id]?.out);
  const initial = initialVariant(variants, isOut);
  const [selectedId, setSelectedId] = useState(initial?.id ?? '');
  const selected = variants.find((v) => v.id === selectedId) ?? initial;
  const gallery = useMemo(
    () => (selected ? imagesFor(images, selected.id) : images),
    [images, selected],
  );
  const [active, setActive] = useState(0);
  const main = gallery[Math.min(active, gallery.length - 1)];

  if (!selected) return null;
  const onSale = selected.compareAtCents && selected.compareAtCents > selected.priceCents;
  const selectedStock = stock[selected.id];

  const choose = (key: string, value: string) => {
    const next = pickVariant(variants, selected, key, value);
    if (next) {
      setSelectedId(next.id);
      setActive(0);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      {/* Gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
          {main && (
            <Image
              key={main.id}
              src={imageUrl(main.base)}
              alt={main.alt}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {gallery.length > 1 && (
          <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Product images">
            {gallery.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}: ${img.alt}`}
                  aria-current={i === active ? 'true' : undefined}
                  className="relative block size-16 overflow-hidden rounded-sm border-2 border-transparent bg-surface-muted aria-[current=true]:border-text"
                >
                  <Image
                    src={imageUrl(img.base)}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Buy box */}
      <div>
        {brandName && <p className="text-sm tracking-wide text-muted uppercase">{brandName}</p>}
        <h1 className="mt-1 text-h1">{name}</h1>
        <a
          href="#reviews"
          className="mt-1 inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
        >
          {rating && rating.count > 0 ? (
            <>
              <Stars value={rating.average} />
              <span className="tabular">
                {rating.average.toFixed(1)} · {rating.count} review{rating.count === 1 ? '' : 's'}
              </span>
            </>
          ) : (
            <span>No reviews yet · be the first</span>
          )}
        </a>
        <p className="mt-4 text-h2 tabular" aria-live="polite">
          {formatLkr(selected.priceCents)}{' '}
          {onSale && (
            <s
              className="text-base text-muted"
              aria-label={`was ${formatLkr(selected.compareAtCents ?? 0)}`}
            >
              {formatLkr(selected.compareAtCents ?? 0)}
            </s>
          )}
        </p>
        <p className="mt-1 text-sm text-muted">
          Delivery fee calculated at checkout · Cash on delivery
        </p>

        {optionAxes.map((axis) => {
          const values = axisValues(variants, axis.key);
          const current = optionValue(selected, axis.key);
          return (
            <fieldset key={axis.key} className="mt-6">
              <legend className="text-sm font-medium">
                {axis.label}: <span className="font-normal">{current}</span>
              </legend>
              <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
                {values.map(({ value, hex }) => {
                  const checked = value === current;
                  const out = valueUnavailable(variants, axis.key, value, isOut);
                  if (axis.kind === 'color') {
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={`${axis.label}: ${value}${out ? ' (sold out)' : ''}`}
                        title={out ? `${value} (sold out)` : value}
                        onClick={() => choose(axis.key, value)}
                        className={`relative flex size-11 items-center justify-center rounded-full border-2 border-transparent aria-checked:border-text ${out ? 'opacity-60' : ''}`}
                      >
                        {hex ? (
                          <Swatch hex={hex} size={32} />
                        ) : (
                          <span className="text-xs">{value}</span>
                        )}
                        {out && <Strike />}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={out ? `${value} (sold out)` : undefined}
                      onClick={() => choose(axis.key, value)}
                      className={`relative min-h-11 overflow-hidden rounded-full border border-border px-4 text-sm aria-checked:border-text aria-checked:bg-text aria-checked:text-bg ${out ? 'text-muted' : ''}`}
                    >
                      {value}
                      {out && <Strike />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {selectedStock?.label && (
          <p
            className={`mt-6 text-sm font-medium ${selectedStock.out ? 'text-muted' : selectedStock.low ? 'text-warning' : 'text-success'}`}
            aria-live="polite"
          >
            {selectedStock.label}
          </p>
        )}

        <AddToBag
          productId={productId}
          variantId={selected.id}
          soldOut={Boolean(selectedStock?.out)}
          maxQty={selectedStock?.max}
          className={selectedStock?.label ? 'mt-3' : 'mt-8'}
        />
        <DeliveryBox key={selected.id} slug={slug} variantId={selected.id} districts={districts} />
        <p className="mt-4 text-xs text-muted">SKU {selected.sku}</p>
      </div>
    </div>
  );
}
