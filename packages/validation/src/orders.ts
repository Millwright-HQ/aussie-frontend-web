import { ORDER_STATUSES, PAYMENT_METHODS } from '@aussie/shared-types';
import { z } from 'zod';
import { MAX_ORDER_LINES } from './inventory.js';
import { addressSchema, lkMobileSchema, paginationSchema, ulidSchema } from './schemas.js';

export const MAX_QTY_PER_LINE = 20;
export const ORDER_NUMBER_PATTERN = /^[A-Z]{2,4}-\d{2}-\d{5,}$/;

const optionalEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().toLowerCase().email('Enter a valid email address').max(200).optional(),
);

/** A cart / checkout line: both ids, so the catalog can find the variant without scanning. */
export const orderItemSchema = z
  .object({
    productId: ulidSchema,
    variantId: ulidSchema,
    qty: z.number({ message: 'Enter a quantity' }).int().min(1).max(MAX_QTY_PER_LINE),
  })
  .strict();
export type OrderItem = z.infer<typeof orderItemSchema>;

export const itemsSchema = z
  .array(orderItemSchema)
  .min(1, 'Your bag is empty')
  .max(MAX_ORDER_LINES)
  .refine((items) => new Set(items.map((i) => i.variantId)).size === items.length, {
    message: 'Each item may appear only once',
  });

export const checkoutSchema = z
  .object({
    /** Name, phone and delivery address (the phone is where staff confirm the order). */
    shipping: addressSchema,
    email: optionalEmail,
    items: itemsSchema,
    paymentMethod: z.enum(PAYMENT_METHODS).default('COD'),
  })
  .strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutRequest = z.input<typeof checkoutSchema>;

// ── Bank transfer ───────────────────────────────────────────────────────────

/** Payment slips: a photo or a PDF from the customer's banking app. */
export const PROOF_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Enter the ${label}`).max(max);

export const bankDetailsSchema = z
  .object({
    accountName: requiredText('account name', 100),
    bankName: requiredText('bank name', 100),
    branch: requiredText('branch', 100),
    accountNumber: z
      .string()
      .trim()
      .regex(/^[0-9][0-9 -]{3,29}$/, 'Enter the account number (digits only)'),
    instructions: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300).optional(),
    ),
  })
  .strict();
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

/** Same proof of identity as tracking: the order number plus the phone it was placed with. */
export const proofRequestSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ORDER_NUMBER_PATTERN, 'Enter your order number, like AC-26-00042'),
    phone: lkMobileSchema,
    contentType: z.enum(PROOF_CONTENT_TYPES, { message: 'Upload a JPG, PNG, WebP or PDF' }),
  })
  .strict();
export type ProofRequest = z.infer<typeof proofRequestSchema>;

export const proofSubmitSchema = z
  .object({
    orderNumber: proofRequestSchema.shape.orderNumber,
    phone: lkMobileSchema,
    /** Returned by the upload request; ties the submit to a slip the server issued. */
    uploadId: ulidSchema,
  })
  .strict();
export type ProofSubmit = z.infer<typeof proofSubmitSchema>;

export const paymentDecisionSchema = z
  .object({
    decision: z.enum(['confirm', 'reject']),
    /** Required when rejecting: the customer sees it. */
    note: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300).optional(),
    ),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.decision === 'reject' && !d.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Tell the customer why' });
    }
  });
export type PaymentDecision = z.infer<typeof paymentDecisionSchema>;

export const trackSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ORDER_NUMBER_PATTERN, 'Enter your order number, like AC-26-00042'),
    phone: lkMobileSchema,
  })
  .strict();
export type TrackInput = z.infer<typeof trackSchema>;

export const statusChangeSchema = z
  .object({
    to: z.enum(ORDER_STATUSES),
    note: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300).optional(),
    ),
    /** Shown to the customer on their order timeline (the `note` above stays internal). */
    customerNote: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(200).optional(),
    ),
    /** SHIPPED: who is carrying it and the tracking number. */
    courier: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().trim().min(2).max(60).optional(),
    ),
    trackingNo: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().trim().min(2).max(60).optional(),
    ),
    /** DELIVERED: cash collected (defaults to the order total). */
    codCollectedCents: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.number().int().min(0).max(1_000_000_000).optional(),
    ),
    /** RETURNED: put the items back into stock. */
    restock: z.boolean().optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.to === 'SHIPPED') {
      if (!c.courier)
        ctx.addIssue({ code: 'custom', path: ['courier'], message: 'Enter the courier' });
      if (!c.trackingNo)
        ctx.addIssue({
          code: 'custom',
          path: ['trackingNo'],
          message: 'Enter the tracking number',
        });
    }
  });
export type StatusChange = z.infer<typeof statusChangeSchema>;

/** A staff note on an order that changes nothing else. */
export const orderNoteSchema = z
  .object({ note: z.string().trim().min(1, 'Write the note').max(300) })
  .strict();
export type OrderNote = z.infer<typeof orderNoteSchema>;

/** Corrections to where a parcel goes. The district (which sets the fee) cannot change. */
export const shippingEditSchema = z
  .object({
    fullName: addressSchema.shape.fullName,
    phone: addressSchema.shape.phone,
    line1: addressSchema.shape.line1,
    line2: addressSchema.shape.line2,
    city: addressSchema.shape.city,
    postalCode: addressSchema.shape.postalCode,
    notes: addressSchema.shape.notes,
  })
  .strict();
export type ShippingEdit = z.infer<typeof shippingEditSchema>;

export const refundSchema = z
  .object({
    note: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(300).optional(),
    ),
  })
  .strict();
export type RefundInput = z.infer<typeof refundSchema>;

/** How long a bank-transfer customer has to upload a slip (0 = never cancel automatically). */
export const paymentSettingsSchema = z
  .object({ windowHours: z.number({ message: 'Enter the hours' }).int().min(0).max(720) })
  .strict();
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export const DEFAULT_PAYMENT_WINDOW_HOURS = 48;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker');
/** Export range: at most a year at a time, so one request stays small. */
export const exportQuerySchema = z
  .object({ from: day, to: day })
  .strict()
  .refine((q) => q.from <= q.to, {
    message: 'The last day must not be before the first day',
    path: ['to'],
  })
  .refine((q) => Date.parse(q.to) - Date.parse(q.from) <= 366 * 86_400_000, {
    message: 'Choose a range of one year or less',
    path: ['to'],
  });
export type ExportQuery = z.infer<typeof exportQuerySchema>;

export const orderListQuerySchema = paginationSchema
  .extend({
    status: z.enum(ORDER_STATUSES).default('PENDING'),
    /** Order number or phone number. */
    q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(30).optional()),
  })
  .strict();
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/** Internal: orders asks the catalog for current data of the variants in a cart. */
export const lookupSchema = z
  .object({
    items: z
      .array(z.object({ productId: ulidSchema, variantId: ulidSchema }).strict())
      .min(1)
      .max(MAX_ORDER_LINES),
  })
  .strict();
export type LookupInput = z.infer<typeof lookupSchema>;
