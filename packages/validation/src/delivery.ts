import { z } from 'zod';
import { districtSchema, ulidSchema } from './schemas.js';

export const MAX_BANDS = 30;
export const MAX_QUOTE_ITEMS = 50;

const cents = (message: string) =>
  z
    .number({ message })
    .int('Use whole cents')
    .min(0, 'Cannot be negative')
    .max(100_000_000, 'Too large');

const days = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.number({ message: 'Enter whole days' }).int().min(0).max(60).optional(),
);

export const bandSchema = z
  .object({
    maxWeightG: z.number({ message: 'Enter a weight in grams' }).int().min(1).max(200_000),
    feeCents: cents('Enter a fee'),
  })
  .strict();

export const bandsInputSchema = z
  .object({ bands: z.array(bandSchema).min(1, 'Add at least one weight band').max(MAX_BANDS) })
  .strict()
  .refine(
    ({ bands }) => bands.every((b, i) => i === 0 || b.maxWeightG > (bands[i - 1]?.maxWeightG ?? 0)),
    {
      message: 'Weights must increase from one band to the next',
      path: ['bands'],
    },
  );
export type BandsInput = z.infer<typeof bandsInputSchema>;

export const zoneInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a zone name').max(60),
    perExtraKgCents: cents('Enter the fee per extra kg'),
    minDays: days,
    maxDays: days,
  })
  .strict()
  .refine((z) => (z.minDays === undefined) === (z.maxDays === undefined), {
    message: 'Enter both the fastest and slowest days, or leave both empty',
    path: ['minDays'],
  })
  .refine((z) => z.minDays === undefined || z.maxDays === undefined || z.minDays <= z.maxDays, {
    message: 'Fastest days cannot be more than slowest days',
    path: ['minDays'],
  });
export type ZoneInput = z.infer<typeof zoneInputSchema>;

export const deliverySettingsSchema = z
  .object({
    mode: z.enum(['FIXED', 'WEIGHT']),
    codFeeCents: cents('Enter the COD fee'),
    freeDeliveryThresholdCents: cents('Enter the free-delivery amount (0 = off)'),
    maxWeightG: z.number({ message: 'Enter the maximum weight' }).int().min(1).max(500_000),
    packagingWeightG: z.number({ message: 'Enter grams (0 for none)' }).int().min(0).max(5000),
    volumetricDivisor: z
      .number({ message: 'Enter the divisor' })
      .int()
      .min(1000, 'Usually 4000-6000')
      .max(20_000, 'Usually 4000-6000'),
    showCodFeeSeparately: z.boolean(),
    isVerified: z.boolean(),
  })
  .strict();
export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;

export const districtAssignmentsSchema = z
  .object({
    assignments: z
      .array(z.object({ code: districtSchema, zoneId: ulidSchema }).strict())
      .min(1)
      .max(25),
  })
  .strict()
  .refine(
    ({ assignments }) => new Set(assignments.map((a) => a.code)).size === assignments.length,
    {
      message: 'A district can only be listed once',
      path: ['assignments'],
    },
  );
export type DistrictAssignments = z.infer<typeof districtAssignmentsSchema>;

/** Per district: on/off and the fixed price (Rs, in cents) used in FIXED mode. */
export const districtFeesSchema = z
  .object({
    districts: z
      .array(
        z
          .object({
            code: districtSchema,
            enabled: z.boolean(),
            fixedFeeCents: cents('Enter the price'),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict()
  .refine(({ districts }) => new Set(districts.map((d) => d.code)).size === districts.length, {
    message: 'A district can only be listed once',
    path: ['districts'],
  });
export type DistrictFees = z.infer<typeof districtFeesSchema>;

const dimension = z.number().int().min(1).max(300);

export const quoteRequestSchema = z
  .object({
    district: districtSchema,
    /** Order subtotal (for the free-delivery threshold). */
    subtotalCents: cents('Invalid subtotal'),
    items: z
      .array(
        z
          .object({
            weightG: z.number().int().min(1).max(200_000),
            qty: z.number().int().min(1).max(99),
            lengthCm: dimension.optional(),
            widthCm: dimension.optional(),
            heightCm: dimension.optional(),
          })
          .strict()
          .refine(
            (i) =>
              [i.lengthCm, i.widthCm, i.heightCm].filter((d) => d !== undefined).length % 3 === 0,
            { message: 'Provide length, width and height together' },
          ),
      )
      .min(1)
      .max(MAX_QUOTE_ITEMS),
  })
  .strict();
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
