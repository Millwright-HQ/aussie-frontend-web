'use client';

import type { Banner } from '@aussie/shared-types';
import { buttonVariants } from '@aussie/ui';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SLIDE_MS = 6000;

/** An internal path uses the router; a secure address opens normally. */
function BannerLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return href.startsWith('/') ? (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} aria-label={label} rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Home page slider. Accessible: every slide has alt text, the buttons have names, it never moves
 * for people who prefer reduced motion, and it pauses on hover, on focus, and on request.
 * `banners` already carry full picture addresses.
 */
export function HeroSlider({ banners }: { banners: (Banner & { src: string })[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = banners.length;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || hovering || reduced) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, count, paused, hovering, reduced]);

  if (count === 0) return null;
  const go = (n: number) => setIndex(((n % count) + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted sm:aspect-[16/7]">
        {banners.map((b, i) => {
          const active = i === index;
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <Image
                unoptimized
                src={b.src}
                alt={b.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover"
              />
              {b.href && !b.buttonLabel && (
                <BannerLink href={b.href} label={b.title ?? b.alt} className="absolute inset-0" />
              )}
              {(b.title || b.subtitle || b.buttonLabel) && (
                <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/70 via-black/20 to-transparent sm:items-center sm:bg-linear-to-r sm:from-black/65 sm:via-black/25">
                  <div className="mx-auto w-full max-w-7xl px-4 pb-14 sm:pb-0 md:px-6 lg:px-8">
                    <div className="max-w-xl space-y-3 text-white">
                      {b.title && <h2 className="text-h1 text-white">{b.title}</h2>}
                      {b.subtitle && <p className="text-base sm:text-lg">{b.subtitle}</p>}
                      {b.buttonLabel && b.href && (
                        <BannerLink href={b.href} className={buttonVariants({ size: 'lg' })}>
                          {b.buttonLabel}
                        </BannerLink>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute right-0 bottom-3 left-0">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={i === index}
                  className="flex size-6 items-center justify-center"
                >
                  <span
                    className={`block h-2 rounded-full transition-all ${
                      i === index ? 'w-6 bg-white' : 'w-2 bg-white/60'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-white">
              <SliderButton label="Previous slide" onClick={() => go(index - 1)}>
                <ChevronLeft aria-hidden size={18} />
              </SliderButton>
              <SliderButton
                label={paused ? 'Start automatic slides' : 'Pause automatic slides'}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <Play aria-hidden size={16} /> : <Pause aria-hidden size={16} />}
              </SliderButton>
              <SliderButton label="Next slide" onClick={() => go(index + 1)}>
                <ChevronRight aria-hidden size={18} />
              </SliderButton>
            </div>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live={paused || hovering ? 'polite' : 'off'}>
        Slide {index + 1} of {count}
      </p>
    </section>
  );
}

function SliderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
    >
      {children}
    </button>
  );
}
