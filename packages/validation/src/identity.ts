import { z } from 'zod';
import { PERMISSIONS } from '@aussie/shared-types';
import { lkMobileSchema, optionalText } from './schemas.js';

/** Must match the Cognito pool password policies in infra/lib/identity-stack.ts. */
const passwordSchema = (minLength: number) =>
  z
    .string()
    .min(minLength, `Use at least ${minLength} characters`)
    .max(256)
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/, 'Add a number')
    .regex(/[^A-Za-z0-9]/, 'Add a symbol');

export const customerPasswordSchema = passwordSchema(10);
export const adminPasswordSchema = passwordSchema(12);

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
export const nameSchema = z.string().trim().min(2, 'Enter your full name').max(100);

/** Six-digit codes: email verification and authenticator (TOTP) codes. */
export const sixDigitCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: customerPasswordSchema,
    marketingOptIn: z.boolean().default(false),
    acceptTerms: z.literal(true, { message: 'You must accept the Terms and Privacy Policy' }),
  })
  .strict();

export const signInSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Enter your password').max(256),
  })
  .strict();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(d)) &&
      d >= '1900-01-01' &&
      d <= new Date().toISOString().slice(0, 10),
    {
      message: 'Enter a valid date',
    },
  );

export const profileUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: z.union([lkMobileSchema, z.literal('').transform(() => null), z.null()]).optional(),
    birthday: z.union([isoDate, z.literal('').transform(() => null), z.null()]).optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict();

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// ── Admin & roles ─────────────────────────────────────────────────────────────

/** Built-in role ids are kebab-case; custom roles get a generated `custom-<ulid>` id. */
export const roleIdSchema = z.string().regex(/^[a-z0-9-]{3,60}$/, 'Invalid role');

export const permissionSchema = z.enum(PERMISSIONS);

export const roleInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: optionalText(300),
    permissions: z
      .array(permissionSchema)
      .min(1, 'Pick at least one permission')
      .max(PERMISSIONS.length),
  })
  .strict();

export type RoleInput = z.infer<typeof roleInputSchema>;

export const createAdminSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    roleId: roleIdSchema,
  })
  .strict();

export const assignRoleSchema = z.object({ roleId: roleIdSchema }).strict();

/** `resetAuthenticator`: also switch their authenticator app off (lost or replaced phone). */
export const resetAdminPasswordSchema = z
  .object({ resetAuthenticator: z.boolean().default(false) })
  .strict();
