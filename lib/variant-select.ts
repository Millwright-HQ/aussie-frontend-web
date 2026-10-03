import type { Variant } from '@aussie/shared-types';

/** Variant selection for any set of options (pure; used by the product page). */

export const optionValue = (v: Pick<Variant, 'options'>, key: string) =>
  v.options.find((o) => o.key === key)?.value;

/** The distinct values of one option across variants, in order of first appearance (with swatch colour). */
export function axisValues(variants: Pick<Variant, 'options'>[], key: string) {
  const seen = new Map<string, { value: string; hex?: string }>();
  for (const v of variants) {
    const o = v.options.find((x) => x.key === key);
    if (o && !seen.has(o.value)) seen.set(o.value, { value: o.value, hex: o.hex });
  }
  return [...seen.values()];
}

/**
 * The variant to show after the shopper picks `value` for option `key`: among the variants with that
 * value, the one that keeps the most of the current choices for the other options (ties keep the
 * catalog order). Returns undefined when no variant has that value.
 */
export function pickVariant<V extends Pick<Variant, 'options'>>(
  variants: V[],
  current: V,
  key: string,
  value: string,
): V | undefined {
  const others = current.options.filter((o) => o.key !== key);
  const score = (v: V) => others.filter((o) => optionValue(v, o.key) === o.value).length;
  let best: V | undefined;
  let bestScore = -1;
  for (const v of variants) {
    if (optionValue(v, key) !== value) continue;
    const s = score(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/** True when every variant with this value is unavailable. */
export const valueUnavailable = <V extends Pick<Variant, 'options'>>(
  variants: V[],
  key: string,
  value: string,
  isOut: (v: V) => boolean,
) => variants.filter((v) => optionValue(v, key) === value).every(isOut);

/** Opens on the default variant, or the first one in stock when the default is sold out. */
export function initialVariant<V extends Pick<Variant, 'isDefault' | 'options'>>(
  variants: V[],
  isOut: (v: V) => boolean,
): V | undefined {
  const preferred = variants.find((v) => v.isDefault) ?? variants[0];
  return preferred && isOut(preferred) ? (variants.find((v) => !isOut(v)) ?? preferred) : preferred;
}
