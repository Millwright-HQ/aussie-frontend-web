import { z } from 'zod';
import { DISTRICT_CODES } from './districts.js';

/**
 * Sri Lankan mobile number. Accepts `0771234567`, `077 123 4567`, `+94771234567`, `94771234567`
 * and normalises to E.164 (`+94771234567`).
 */
export const lkMobileSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ''))
  .transform((v) => {
    if (/^07\d{8}$/.test(v)) return `+94${v.slice(1)}`;
    if (/^947\d{8}$/.test(v)) return `+${v}`;
    return v;
  })
  .pipe(z.string().regex(/^\+947\d{8}$/, 'Enter a valid Sri Lankan mobile number'));

export const districtSchema = z.enum(DISTRICT_CODES);

/** Integer cents, LKR × 100. Upper bound guards against overflow/abuse (Rs 10 million). */
export const centsSchema = z.number().int().min(0).max(1_000_000_000);

/** Integer grams. Upper bound 100 kg. */
export const gramsSchema = z.number().int().min(0).max(100_000);

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid id');

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens')
  .refine((s) => !s.startsWith('-') && !s.endsWith('-') && !s.includes('--'), {
    message: 'Hyphens only between words',
  });

export const paginationSchema = z.object({
  cursor: z.string().max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Optional text field: HTML forms send "" for empty inputs, which we treat as "not provided". */
export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const addressSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    phone: lkMobileSchema,
    line1: z.string().trim().min(3).max(200),
    line2: optionalText(200),
    city: z.string().trim().min(2).max(100),
    district: districtSchema,
    postalCode: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .trim()
        .regex(/^\d{5}$/, 'Postal code is 5 digits')
        .optional(),
    ),
    notes: optionalText(300),
  })
  .strict();

export type Address = z.infer<typeof addressSchema>;
