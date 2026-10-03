/**
 * Shade swatch drawn as SVG: `fill` is an attribute, not inline CSS, so it works under our strict
 * Content-Security-Policy (no 'unsafe-inline' styles). A ring keeps very light shades visible.
 */
export function Swatch({ hex, size = 16, title }: { hex: string; size?: number; title?: string }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#cccccc';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <circle
        cx="8"
        cy="8"
        r="7.25"
        fill={safe}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
    </svg>
  );
}
