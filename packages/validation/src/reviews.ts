import { REVIEW_STATUSES } from '@aussie/shared-types';
import { z } from 'zod';
import { paginationSchema, ulidSchema } from './schemas.js';

const optionalTitle = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().min(3, 'Make the title at least 3 characters').max(100).optional(),
);

export const reviewInputSchema = z
  .object({
    productId: ulidSchema,
    rating: z.coerce
      .number({ message: 'Choose a star rating' })
      .int('Choose a star rating')
      .min(1, 'Choose a star rating')
      .max(5, 'Choose a star rating'),
    title: optionalTitle,
    body: z
      .string()
      .trim()
      .min(10, 'Tell us a little more (at least 10 characters)')
      .max(2000, 'Please keep it under 2,000 characters'),
  })
  .strict();
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const reviewListQuerySchema = paginationSchema.extend({ productId: ulidSchema }).strict();

export const moderationSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300).optional(),
    ),
  })
  .strict();
export type Moderation = z.infer<typeof moderationSchema>;

export const queueQuerySchema = paginationSchema
  .extend({ status: z.enum(REVIEW_STATUSES).default('PENDING') })
  .strict();
export type QueueQuery = z.infer<typeof queueQuerySchema>;
