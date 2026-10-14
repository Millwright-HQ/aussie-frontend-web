import type { Brand } from '@aussie/shared-types';
import Image from 'next/image';
import Link from 'next/link';
import { sitePictureUrl } from '@/lib/content';

/** Enough logos in each half that the strip always fills a wide screen. */
const MIN_PER_HALF = 8;
const SECONDS_PER_LOGO = 4;

/**
 * Brand logos sliding slowly across the page. It pauses when pointed at or focused, and for people
 * who prefer reduced motion it becomes a row they scroll themselves (see globals.css).
 */
export function BrandMarquee({ brands }: { brands: (Brand & { logoPath: string })[] }) {
  const repeats = Math.ceil(MIN_PER_HALF / brands.length);
  const half = Array.from({ length: repeats }, () => brands).flat();

  const logos = (hidden: boolean) =>
    half.map((b, i) => (
      <li key={`${b.id}-${i}`} className="mr-8 shrink-0 md:mr-12">
        <Link
          href={`/shop?brand=${encodeURIComponent(b.slug)}`}
          tabIndex={hidden ? -1 : undefined}
          className="flex h-16 w-32 items-center justify-center md:h-20 md:w-40"
        >
          <Image
            unoptimized
            src={sitePictureUrl(b.logoPath)}
            alt={hidden ? '' : b.name}
            width={160}
            height={80}
            className="max-h-full w-auto max-w-full object-contain"
          />
        </Link>
      </li>
    ));

  return (
    <div
      className="brand-marquee overflow-hidden"
      style={{ '--marquee-duration': `${half.length * SECONDS_PER_LOGO}s` } as React.CSSProperties}
    >
      <div className="brand-marquee-track">
        <ul aria-label="Our brands" className="flex">
          {logos(false)}
        </ul>
        {/* The copy that makes the loop seamless; hidden from screen readers and the tab order. */}
        <ul aria-hidden className="flex">
          {logos(true)}
        </ul>
      </div>
    </div>
  );
}
