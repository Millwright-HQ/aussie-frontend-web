import { ADJUSTMENT_REASONS } from '@aussie/shared-types';
import { z } from 'zod';
import { lkMobileSchema, optionalText, ulidSchema } from './schemas.js';

export const stockAdjustmentSchema = z
  .object({
    delta: z.coerce
      .number({ message: 'Enter how many units' })
      .int('Use whole units')
      .min(-100_000)
      .max(100_000)
      .refine((n) => n !== 0, 'The change cannot be zero'),
    reason: z.enum(ADJUSTMENT_REASONS, { message: 'Choose a reason' }),
    note: optionalText(200),
  })
  .strict()
  .superRefine((a, ctx) => {
    if ((a.reason === 'RECEIVED' || a.reason === 'RETURNED') && a.delta < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['delta'],
        message: 'Received/returned stock must be a positive number',
      });
    }
    if (a.reason === 'DAMAGED' && a.delta > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['delta'],
        message: 'Damaged/lost stock must be a negative number',
      });
    }
  });
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const thresholdSchema = z
  .object({
    /** null = use the store default. */
    lowStockThreshold: z.preprocess(
      (v) => (v === '' ? null : v),
      z.coerce.number().int().min(0).max(10_000).nullable(),
    ),
  })
  .strict();

export const MAX_ORDER_LINES = 30;

/** Internal (service-to-service) allocation request from the orders service. */
export const allocationSchema = z
  .object({
    orderId: ulidSchema,
    items: z
      .array(z.object({ variantId: ulidSchema, qty: z.number().int().min(1).max(99) }).strict())
      .min(1)
      .max(MAX_ORDER_LINES),
  })
  .strict()
  .refine((a) => new Set(a.items.map((i) => i.variantId)).size === a.items.length, {
    message: 'Each variant may appear only once',
    path: ['items'],
  });
export type Allocation = z.infer<typeof allocationSchema>;

export const stockFilterSchema = z
  .object({ filter: z.enum(['all', 'low', 'out']).default('all') })
  .strict();

/** A shopper joining the waitlist for a sold-out variant. */
export const waitlistSignupSchema = z
  .object({
    productId: ulidSchema,
    variantId: ulidSchema,
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,120}$/, 'Could not find this product'),
    email: z
      .string({ message: 'Enter your email' })
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .max(200),
    name: optionalText(100),
    phone: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      lkMobileSchema.optional(),
    ),
  })
  .strict();
export type WaitlistSignup = z.infer<typeof waitlistSignupSchema>;
