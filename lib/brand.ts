/**
 * Turns the owner's brand colour into colours that stay readable. The owner picks one colour; the
 * shop needs it as a button background (with readable text on it) and as link text on the page
 * background, in both the light and the dark theme. Whatever is picked, we nudge it until the
 * contrast is at least 4.5:1 (WCAG AA for normal text).
 */

const LIGHT_PAGE = '#ffffff';
const DARK_PAGE = '#171717';
const MIN_CONTRAST = 4.5;

export const isHexColour = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour (white or near-black) that reads best on `background`. */
export const readableOn = (background: string): string =>
  contrast('#ffffff', background) >= contrast('#111111', background) ? '#ffffff' : '#111111';

/** Mixes `hex` towards `target` in small steps until it has enough contrast with `page`. */
function nudge(hex: string, page: string, target: '#000000' | '#ffffff'): string {
  const from = toRgb(hex);
  const [tr, tg, tb] = toRgb(target);
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const [r, g, b] = from;
    const mixed = toHex([r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t]);
    if (contrast(mixed, page) >= MIN_CONTRAST) return mixed;
  }
  return target;
}

export interface BrandVars {
  '--brand-light': string;
  '--brand-light-fg': string;
  '--brand-dark': string;
  '--brand-dark-fg': string;
}

/** CSS variables for the shop's theme root, or undefined when no (valid) brand colour is set. */
export function brandVars(hex: string | undefined): BrandVars | undefined {
  if (!isHexColour(hex)) return undefined;
  const lower = hex.toLowerCase();
  const light = nudge(lower, LIGHT_PAGE, '#000000'); // darker until readable on white
  const dark = nudge(lower, DARK_PAGE, '#ffffff'); // lighter until readable on near-black
  return {
    '--brand-light': light,
    '--brand-light-fg': readableOn(light),
    '--brand-dark': dark,
    '--brand-dark-fg': readableOn(dark),
  };
}
