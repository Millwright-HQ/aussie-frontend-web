import Image from 'next/image';
import { STORE_NAME } from '@/lib/site';

/**
 * The OZARA wordmark: full colour on the light theme, reversed on the dark one. The files are
 * static brand assets in public/brand (never uploaded by users). `height` is the Tailwind height
 * class; the width follows the 4.5:1 artwork.
 */
export function BrandLogo({ height = 'h-9' }: { height?: string }) {
  const common = { unoptimized: true, alt: STORE_NAME, width: 162, height: 36 } as const;
  return (
    <>
      <Image
        {...common}
        src="/brand/ozara-logo.svg"
        className={`block ${height} w-auto object-contain [[data-theme=dark]_&]:hidden`}
      />
      <Image
        {...common}
        src="/brand/ozara-logo-reversed.svg"
        className={`hidden ${height} w-auto object-contain [[data-theme=dark]_&]:block`}
      />
    </>
  );
}
