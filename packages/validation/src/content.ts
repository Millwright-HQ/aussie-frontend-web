import { INQUIRY_STATUSES, INQUIRY_TOPICS, PAGE_SLUGS, THEME_MODES } from '@aussie/shared-types';
import { z } from 'zod';
import { ORDER_NUMBER_PATTERN } from './orders.js';
import { lkMobileSchema, optionalText, ulidSchema } from './schemas.js';

export const MAX_SITE_IMAGE_BYTES = 3 * 1024 * 1024;
export const SITE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const SITE_IMAGE_EXTENSIONS: Record<(typeof SITE_IMAGE_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** `site/<26-char id>.<jpg|png|webp>`: only paths the upload endpoint issues are accepted. */
export const SITE_IMAGE_PATH = /^site\/[0-9A-HJKMNP-TV-Z]{26}\.(jpg|png|webp)$/;

const empty = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const dateSchema = z.preprocess(
  empty,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker')
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), 'Enter a real date')
    .optional(),
);

/** A page on this store (`/shop`) or a secure web address. Never `//host`, `javascript:` or `http:`. */
export const linkSchema = z.preprocess(
  empty,
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^\/(?!\/)\S*$/.test(v) || /^https:\/\/\S+$/.test(v), {
      message: 'Use a page like /shop or a secure address starting with https://',
    })
    .optional(),
);

const httpsUrl = (label: string) =>
  z.preprocess(
    empty,
    z
      .string()
      .trim()
      .max(300)
      .refine((v) => /^https:\/\/\S+$/.test(v), { message: `${label}: start with https://` })
      .optional(),
  );

const phoneText = z.preprocess(
  empty,
  z
    .string()
    .trim()
    .regex(/^[0-9+ ()-]{7,20}$/, 'Enter a phone number')
    .optional(),
);

const emailText = z.preprocess(
  empty,
  z.string().trim().toLowerCase().email('Enter a valid email address').max(200).optional(),
);

const whatsappText = z.preprocess(empty, lkMobileSchema.optional());

export const siteSettingsSchema = z
  .object({
    tagline: optionalText(120),
    phone: phoneText,
    whatsapp: whatsappText,
    email: emailText,
    address: optionalText(200),
    facebook: httpsUrl('Facebook'),
    instagram: httpsUrl('Instagram'),
    tiktok: httpsUrl('TikTok'),
    youtube: httpsUrl('YouTube'),
    footerNote: optionalText(200),
    announcement: z
      .object({
        enabled: z.boolean(),
        text: z.string().trim().max(160),
        href: linkSchema,
      })
      .strict()
      .refine((a) => !a.enabled || a.text.length > 0, {
        message: 'Write the announcement text, or switch it off',
        path: ['text'],
      }),
    theme: z
      .object({
        defaultMode: z.enum(THEME_MODES),
      })
      .strict(),
    home: z
      .object({
        showCategories: z.boolean(),
        showNewIn: z.boolean(),
        showTrustBar: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

export const bannerInputSchema = z
  .object({
    imagePath: z.string().regex(SITE_IMAGE_PATH, 'Upload the image first'),
    alt: z.string().trim().min(2, 'Describe the picture for people who cannot see it').max(160),
    title: optionalText(80),
    subtitle: optionalText(160),
    buttonLabel: optionalText(30),
    href: linkSchema,
    sortOrder: z.number({ message: 'Enter a number' }).int().min(0).max(999),
    active: z.boolean(),
    startsOn: dateSchema,
    endsOn: dateSchema,
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.buttonLabel && !b.href) {
      ctx.addIssue({ code: 'custom', path: ['href'], message: 'Where should the button go?' });
    }
    if (b.startsOn && b.endsOn && b.startsOn > b.endsOn) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'The last day must not be before the first day',
      });
    }
  });
export type BannerInput = z.infer<typeof bannerInputSchema>;

export const pageSlugSchema = z.enum(PAGE_SLUGS);

export const pageInputSchema = z
  .object({
    title: z.string().trim().min(2, 'Enter a title').max(120),
    body: z.string().max(20_000, 'That is too long (20,000 characters at most)'),
    published: z.boolean(),
  })
  .strict();
export type PageInput = z.infer<typeof pageInputSchema>;

export const siteUploadRequestSchema = z
  .object({
    contentType: z.enum(SITE_IMAGE_TYPES, { message: 'Upload a JPG, PNG or WebP image' }),
    size: z.number().int().min(1).max(MAX_SITE_IMAGE_BYTES, 'The image must be 3 MB or smaller'),
  })
  .strict();
export type SiteUploadRequest = z.infer<typeof siteUploadRequestSchema>;

export const bannerIdSchema = ulidSchema;

export const SITE_LOCK_MIN_PASSWORD = 6;

/** Admin: switch the launch lock on/off, change its message and (optionally) the password. */
export const siteLockSchema = z
  .object({
    enabled: z.boolean(),
    message: optionalText(300),
    /** Leave empty to keep the current password. */
    password: z.preprocess(
      (v) => (typeof v === 'string' && v === '' ? undefined : v),
      z
        .string()
        .min(SITE_LOCK_MIN_PASSWORD, `Use at least ${SITE_LOCK_MIN_PASSWORD} characters`)
        .max(100)
        .optional(),
    ),
  })
  .strict();
export type SiteLockInput = z.infer<typeof siteLockSchema>;

export const siteLockVerifySchema = z
  .object({
    password: z.string({ message: 'Enter the password' }).min(1, 'Enter the password').max(100),
  })
  .strict();
export type SiteLockVerify = z.infer<typeof siteLockVerifySchema>;

export const NEWSLETTER_SOURCES = ['footer', 'coming-soon'] as const;

/** A visitor joining the newsletter / launch list. */
export const newsletterSignupSchema = z
  .object({
    email: z
      .string({ message: 'Enter your email' })
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .max(200),
    source: z.enum(NEWSLETTER_SOURCES).default('footer'),
  })
  .strict();
export type NewsletterSignup = z.infer<typeof newsletterSignupSchema>;

// ── Contact page inquiries ──────────────────────────────────────────────────

export const inquirySchema = z
  .object({
    name: z.string({ message: 'Enter your name' }).trim().min(2, 'Enter your name').max(100),
    email: z
      .string({ message: 'Enter your email' })
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .max(200),
    phone: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      lkMobileSchema.optional(),
    ),
    topic: z.enum(INQUIRY_TOPICS, { message: 'Choose what this is about' }),
    orderNumber: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(ORDER_NUMBER_PATTERN, 'Enter the order number, e.g. AC-26-00042')
        .optional(),
    ),
    subject: z.string({ message: 'Enter a subject' }).trim().min(3, 'Enter a subject').max(120),
    message: z
      .string({ message: 'Write your message' })
      .trim()
      .min(10, 'Please write a little more (at least 10 characters)')
      .max(2000, 'Keep the message under 2000 characters'),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (q.topic === 'ORDER' && !q.orderNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['orderNumber'],
        message: 'Add your order number so we can find it',
      });
    }
  });
export type InquiryInput = z.infer<typeof inquirySchema>;

/** Staff: move an inquiry to a new status and/or leave an internal note. */
export const inquiryStatusSchema = z
  .object({
    status: z.enum(INQUIRY_STATUSES, { message: 'Choose a status' }),
    note: optionalText(500),
  })
  .strict();
export type InquiryStatusInput = z.infer<typeof inquiryStatusSchema>;
