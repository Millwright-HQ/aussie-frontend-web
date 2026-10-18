import { PROMOTION_KINDS, PROMOTION_SCOPES } from '@aussie/shared-types';
import { z } from 'zod';
import { ulidSchema } from './schemas.js';

/** A percentage code cannot give more than this off, so a typo cannot give the shop away. */
export const MAX_PROMO_PERCENT = 90;
export const MAX_PROMO_TARGETS = 200;

const empty = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** What the customer types: case does not matter. */
export const promoCodeSchema = z
  .string({ message: 'Enter a code' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{2,23}$/, 'Codes are 3 to 24 letters, numbers, - or _');

const optionalCents = (label: string) =>
  z.preprocess(
    empty,
    z
      .number({ message: `Enter the ${label}` })
      .int('Use a whole number of cents')
      .min(1, `The ${label} must be more than 0`)
      .max(100_000_000)
      .optional(),
  );

const optionalDate = z.preprocess(
  empty,
  z.iso.datetime({ message: 'Enter a valid date' }).optional(),
);

const promotionFields = {
  name: z.string().trim().min(1, 'Give the promotion a name').max(80),
  kind: z.enum(PROMOTION_KINDS),
  /** PERCENT: whole percent. FIXED: cents. FREE_DELIVERY: 0. */
  value: z
    .number({ message: 'Enter the discount' })
    .int('Use a whole number')
    .min(0)
    .max(100_000_000),
  scope: z.enum(PROMOTION_SCOPES),
  targetIds: z.array(ulidSchema).max(MAX_PROMO_TARGETS).default([]),
  /** Absent = unlimited. */
  maxUses: z.preprocess(
    empty,
    z
      .number({ message: 'Enter how many times' })
      .int()
      .min(1, 'At least 1 use')
      .max(1_000_000)
      .optional(),
  ),
  startsAt: optionalDate,
  endsAt: optionalDate,
  minSubtotalCents: optionalCents('minimum order'),
  maxDiscountCents: optionalCents('maximum discount'),
  active: z.boolean().default(true),
};

type Rules = {
  kind: (typeof PROMOTION_KINDS)[number];
  value: number;
  scope: (typeof PROMOTION_SCOPES)[number];
  targetIds: string[];
  startsAt?: string | undefined;
  endsAt?: string | undefined;
};

function checkRules(c: Rules, ctx: z.RefinementCtx) {
  const bad = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  if (c.kind === 'PERCENT' && (c.value < 1 || c.value > MAX_PROMO_PERCENT)) {
    bad('value', `Percentage must be between 1 and ${MAX_PROMO_PERCENT}`);
  }
  if (c.kind === 'FIXED' && c.value < 1) bad('value', 'Enter the amount off');
  if (c.kind === 'FREE_DELIVERY' && c.value !== 0)
    bad('value', 'A free-delivery code has no amount');
  if (c.kind === 'FREE_DELIVERY' && c.scope !== 'ORDER') {
    bad('scope', 'A free-delivery code applies to the whole order');
  }
  if (c.scope === 'ORDER' && c.targetIds.length > 0)
    bad('targetIds', 'Whole-order codes have no targets');
  if (c.scope !== 'ORDER' && c.targetIds.length === 0) {
    bad(
      'targetIds',
      c.scope === 'PRODUCTS' ? 'Choose at least one product' : 'Choose at least one category',
    );
  }
  if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt)
    bad('endsAt', 'The end must be after the start');
}

export const promotionInputSchema = z
  .object({ code: promoCodeSchema, ...promotionFields })
  .strict()
  .superRefine(checkRules);
export type PromotionInput = z.infer<typeof promotionInputSchema>;

/** The code cannot change once created (uses are counted against it). */
export const promotionUpdateSchema = z.object(promotionFields).strict().superRefine(checkRules);
export type PromotionUpdate = z.infer<typeof promotionUpdateSchema>;
