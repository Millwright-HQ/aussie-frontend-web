'use client';

/** Renditions written by the catalog image processor (keep in sync with IMAGE_WIDTHS). */
const WIDTHS = [320, 640, 1024, 1600];

/**
 * next/image loader for product media. `src` is the image base URL (`<cdn>/media/<p>/<i>`);
 * the smallest rendition at least as wide as requested is used.
 */
export default function productImageLoader({ src, width }: { src: string; width: number }) {
  if (!src.startsWith('http')) return src; // local static assets
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${src}/${w}.webp`;
}
