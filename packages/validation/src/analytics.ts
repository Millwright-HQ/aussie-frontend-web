import { BROWSERS, DEVICES, SYSTEMS, TRACK_TYPES } from '@aussie/shared-types';
import { z } from 'zod';
import { ulidSchema } from './schemas.js';

/** Pages worth counting. Anything else is refused, so random paths cannot fill the table. */
export const TRACK_PATH =
  /^(?:\/|\/(?:shop|cart|checkout|search|track|account)|\/order\/placed|\/(?:c|info|p)\/[a-z0-9-]{1,80})$/;

export const visitEventSchema = z
  .object({
    type: z.enum(TRACK_TYPES),
    /** Anonymous visitor for the day, made by the website (never an IP address). */
    vid: z.string().regex(/^[A-Za-z0-9_-]{8,24}$/),
    path: z.string().regex(TRACK_PATH).optional(),
    productId: ulidSchema.optional(),
    /** The first page of a visit: only then are the referrer and campaign counted. */
    entry: z.boolean().optional(),
    /** Host the visitor came from, e.g. "instagram.com"; absent = direct. */
    ref: z
      .string()
      .toLowerCase()
      .regex(/^[a-z0-9.-]{3,60}$/)
      .optional(),
    /** utm_source / utm_campaign, as typed in the link. */
    campaign: z
      .string()
      .toLowerCase()
      .regex(/^[a-z0-9 _.+-]{1,40}$/)
      .optional(),
    device: z.enum(DEVICES),
    browser: z.enum(BROWSERS),
    system: z.enum(SYSTEMS),
    /** Two-letter country when the host reports it. */
    country: z
      .string()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.type === 'view' && !t.path) {
      ctx.addIssue({ code: 'custom', path: ['path'], message: 'A page view needs a path' });
    }
    if ((t.type === 'product' || t.type === 'cart') && !t.productId) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'This needs a product' });
    }
  });
export type VisitEventInput = z.infer<typeof visitEventSchema>;

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export const analyticsQuerySchema = z
  .object({
    days: z.coerce
      .number()
      .int()
      .refine((n) => (ANALYTICS_RANGES as readonly number[]).includes(n), 'Choose 7, 30 or 90 days')
      .default(30),
  })
  .strict();
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
