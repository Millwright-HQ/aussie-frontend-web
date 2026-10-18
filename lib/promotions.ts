import type { Promotion, PromotionStatus } from '@aussie/shared-types';
import { formatLkr } from '@aussie/ui';

/** "10% off", "LKR 500 off" or "Free delivery". */
export function describeDiscount(p: Pick<Promotion, 'kind' | 'value'>): string {
  if (p.kind === 'PERCENT') return `${p.value}% off`;
  if (p.kind === 'FIXED') return `${formatLkr(p.value)} off`;
  return 'Free delivery';
}

/** What the code applies to, in words. */
export function describeScope(p: Pick<Promotion, 'scope' | 'targetIds'>): string {
  const n = p.targetIds.length;
  if (p.scope === 'PRODUCTS') return `${n} product${n === 1 ? '' : 's'}`;
  if (p.scope === 'CATEGORIES') return `${n} categor${n === 1 ? 'y' : 'ies'}`;
  return 'Whole order';
}

export const STATUS_LABEL: Record<PromotionStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
  USED_UP: 'Used up',
};

export const STATUS_TONE: Record<PromotionStatus, 'success' | 'neutral' | 'info' | 'warning'> = {
  ACTIVE: 'success',
  PAUSED: 'neutral',
  SCHEDULED: 'info',
  EXPIRED: 'warning',
  USED_UP: 'warning',
};

/** Sri Lanka has no daylight saving: always UTC+05:30. */
const COLOMBO_OFFSET_MS = 5.5 * 3_600_000;

/** ISO time -> value for a datetime-local input, in Sri Lanka time. */
export function toColomboInput(iso?: string): string {
  if (!iso) return '';
  return new Date(Date.parse(iso) + COLOMBO_OFFSET_MS).toISOString().slice(0, 16);
}

/** Value of a datetime-local input (Sri Lanka time) -> ISO time; '' when empty or invalid. */
export function fromColomboInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return '';
  const ms = Date.parse(`${value}:00.000Z`) - COLOMBO_OFFSET_MS;
  return Number.isNaN(ms) ? '' : new Date(ms).toISOString();
}

/** Rupees typed by the owner ("1,500.50") -> cents; undefined when blank, NaN when not a number. */
export function rupeesToCents(value: string): number | undefined {
  const v = value.replace(/,/g, '').trim();
  return v === '' ? undefined : Math.round(Number(v) * 100);
}

/** Cents -> rupees for an input ("1500" or "1500.5"). */
export const centsToRupees = (cents?: number): string =>
  cents === undefined ? '' : String(cents / 100);
