import { FESTIVAL_KEYS, FESTIVAL_MODES, PAGE_SLUGS, THEME_MODES } from '@aussie/shared-types';
import { z } from 'zod';
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
    storeName: z.string().trim().min(1, 'Enter the store name').max(60),
    tagline: optionalText(120),
    logoPath: z.preprocess(
      empty,
      z.string().regex(SITE_IMAGE_PATH, 'Upload the logo again').optional(),
    ),
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
        brandColor: z.preprocess(
          empty,
          z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
            .transform((c) => c.toLowerCase())
            .optional(),
        ),
        festival: z
          .object({
            mode: z.enum(FESTIVAL_MODES),
            key: z.enum(FESTIVAL_KEYS),
            startsOn: dateSchema,
            endsOn: dateSchema,
          })
          .strict()
          .superRefine((f, ctx) => {
            if (f.mode !== 'scheduled') return;
            if (!f.startsOn || !f.endsOn) {
              ctx.addIssue({
                code: 'custom',
                path: ['startsOn'],
                message: 'Choose the first and last day',
              });
            } else if (f.startsOn > f.endsOn) {
              ctx.addIssue({
                code: 'custom',
                path: ['endsOn'],
                message: 'The last day must not be before the first day',
              });
            }
          }),
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
