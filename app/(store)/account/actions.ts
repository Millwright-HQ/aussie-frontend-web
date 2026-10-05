'use server';

import {
  addressSchema,
  customerPasswordSchema,
  emailSchema,
  profileUpdateSchema,
  signUpSchema,
  sixDigitCodeSchema,
  ulidSchema,
} from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  authErrorMessage,
  changePassword,
  confirmPasswordReset,
  confirmSignUp,
  resendSignUpCode,
  revoke,
  signInWithPassword,
  signUp,
  startPasswordReset,
} from '@/lib/auth/cognito';
import {
  clearSession,
  clientContext,
  getSession,
  readFlow,
  readRefresh,
  safeNext,
  writeFlow,
  writeSession,
} from '@/lib/auth/session';

export interface FormState {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

const WELCOME_SKIPPED = 'aussie_welcome_skipped';

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out = new Map<string, string>();
  for (const i of issues) {
    const key = String(i.path[0] ?? 'form');
    if (!out.has(key)) out.set(key, i.message);
  }
  return Object.fromEntries(out);
}

const text = (form: FormData, key: string) => String(form.get(key) ?? '');

// ── Sign up (step 1) and email verification ──────────────────────────────────

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { name: text(form, 'name'), email: text(form, 'email') };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(form, 'password'),
    marketingOptIn: form.get('marketingOptIn') === 'on',
    acceptTerms: form.get('acceptTerms') === 'on',
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  try {
    await signUp(parsed.data);
  } catch (err) {
    return { error: authErrorMessage(err), values };
  }
  // The email lives in the encrypted flow cookie, never in the URL (docs/SECURITY.md §6).
  await writeFlow('customer', { step: 'verify-email', email: parsed.data.email });
  redirect('/account/verify');
}

export async function verifyEmailAction(_prev: FormState, form: FormData): Promise<FormState> {
  const flow = await readFlow('customer');
  if (flow?.step !== 'verify-email' || !flow.email)
    return { error: 'Your session expired. Sign in to continue.' };
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { fieldErrors: { code: 'Enter the 6-digit code from the email' } };
  try {
    await confirmSignUp(flow.email, code.data);
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  await writeFlow('customer', { step: 'verify-email', email: flow.email, next: 'verified' });
  redirect('/account/sign-in?verified=1');
}

export async function resendCodeAction(_prev: FormState): Promise<FormState> {
  const flow = await readFlow('customer');
  if (flow?.step !== 'verify-email' || !flow.email)
    return { error: 'Your session expired. Sign up again.' };
  try {
    await resendSignUpCode(flow.email);
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return { ok: 'A new code is on its way.' };
}

// ── Sign in / out ───────────────────────────────────────────────────────────

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get('email'));
  const password = text(form, 'password');
  const values = { email: text(form, 'email') };
  if (!email.success || !password) return { error: 'Enter your email and password.', values };

  try {
    const step = await signInWithPassword('customer', email.data, password, await clientContext());
    if (step.kind !== 'tokens')
      return { error: 'This account needs attention. Please contact us.', values };
    await writeSession('customer', step.tokens, step.username);
  } catch (err) {
    if ((err as { name?: string }).name === 'UserNotConfirmedException') {
      await writeFlow('customer', { step: 'verify-email', email: email.data });
      await resendSignUpCode(email.data).catch(() => undefined);
      redirect('/account/verify');
    }
    return { error: authErrorMessage(err), values };
  }

  const next = safeNext(form.get('next'), '/account', '/account');
  redirect((await needsWelcome()) ? `/account/welcome?next=${encodeURIComponent(next)}` : next);
}

/** Step 2 is offered until the customer has a mobile or an address, unless they skipped it. */
async function needsWelcome(): Promise<boolean> {
  if ((await cookies()).get(WELCOME_SKIPPED)) return false;
  try {
    const [profile, addresses] = await Promise.all([
      api<{ phone: string | null }>('customer', '/v1/identity/me'),
      api<{ items: unknown[] }>('customer', '/v1/identity/me/addresses'),
    ]);
    return !profile.phone && addresses.items.length === 0;
  } catch {
    return false;
  }
}

export async function signOutAction(): Promise<never> {
  // Recorded first, while the session still works; a failure here must never block signing out.
  await api('customer', '/v1/identity/me/signout', { method: 'POST' }).catch(() => undefined);
  const refresh = await readRefresh('customer');
  if (refresh) await revoke('customer', refresh.refreshToken).catch(() => undefined);
  await clearSession('customer');
  redirect('/');
}

// ── Forgot password ─────────────────────────────────────────────────────────

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get('email'));
  if (!email.success) return { fieldErrors: { email: 'Enter a valid email' } };
  try {
    await startPasswordReset('customer', email.data);
  } catch (err) {
    // Don't reveal whether the account exists; only surface throttling.
    const name = (err as { name?: string }).name;
    if (name === 'LimitExceededException' || name === 'TooManyRequestsException') {
      return { error: authErrorMessage(err) };
    }
  }
  await writeFlow('customer', { step: 'reset-password', email: email.data });
  redirect('/account/forgot-password?sent=1');
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const flow = await readFlow('customer');
  if (flow?.step !== 'reset-password' || !flow.email)
    return { error: 'Your session expired. Start again.' };
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  const password = customerPasswordSchema.safeParse(form.get('password'));
  const errors: Record<string, string> = {};
  if (!code.success) errors.code = 'Enter the 6-digit code from the email';
  if (!password.success) errors.password = password.error.issues[0]?.message ?? 'Invalid password';
  if (!code.success || !password.success) return { fieldErrors: errors };
  try {
    await confirmPasswordReset('customer', flow.email, code.data, password.data);
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  redirect('/account/sign-in?reset=1');
}

// ── Account (signed in) ─────────────────────────────────────────────────────

async function apiAction(fn: () => Promise<unknown>, ok: string, path: string): Promise<FormState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect('/account/sign-in');
      return { error: err.userMessage };
    }
    throw err;
  }
  revalidatePath(path);
  return { ok };
}

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = profileUpdateSchema.safeParse({
    name: text(form, 'name'),
    phone: text(form, 'phone'),
    birthday: text(form, 'birthday'),
    marketingOptIn: form.get('marketingOptIn') === 'on',
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  return apiAction(
    () => api('customer', '/v1/identity/me', { method: 'PUT', body: parsed.data }),
    'Profile saved.',
    '/account',
  );
}

function addressFrom(form: FormData) {
  return addressSchema.safeParse({
    fullName: text(form, 'fullName'),
    phone: text(form, 'phone'),
    line1: text(form, 'line1'),
    line2: text(form, 'line2'),
    city: text(form, 'city'),
    district: text(form, 'district'),
    postalCode: text(form, 'postalCode'),
    notes: text(form, 'notes'),
  });
}

export async function saveAddressAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = addressFrom(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const id = form.get('id');
  if (id) {
    const addressId = ulidSchema.safeParse(id);
    if (!addressId.success) return { error: 'Invalid address' };
    return apiAction(
      () =>
        api('customer', `/v1/identity/me/addresses/${addressId.data}`, {
          method: 'PUT',
          body: parsed.data,
        }),
      'Address updated.',
      '/account/addresses',
    );
  }
  return apiAction(
    () => api('customer', '/v1/identity/me/addresses', { method: 'POST', body: parsed.data }),
    'Address saved.',
    '/account/addresses',
  );
}

export async function deleteAddressAction(_prev: FormState, form: FormData): Promise<FormState> {
  const id = ulidSchema.safeParse(form.get('id'));
  if (!id.success) return { error: 'Invalid address' };
  return apiAction(
    () => api('customer', `/v1/identity/me/addresses/${id.data}`, { method: 'DELETE' }),
    'Address removed.',
    '/account/addresses',
  );
}

export async function setDefaultAddressAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const id = ulidSchema.safeParse(form.get('id'));
  if (!id.success) return { error: 'Invalid address' };
  return apiAction(
    () => api('customer', `/v1/identity/me/addresses/${id.data}/default`, { method: 'POST' }),
    'Default address updated.',
    '/account/addresses',
  );
}

/** Step 2 of sign-up: mobile + first address in one go. */
export async function welcomeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const phone = profileUpdateSchema.safeParse({ phone: text(form, 'phone') });
  const address = addressFrom(form);
  const errors = {
    ...(phone.success ? {} : fieldErrors(phone.error.issues)),
    ...(address.success ? {} : fieldErrors(address.error.issues)),
  };
  if (!phone.success || !address.success) return { fieldErrors: errors };
  const result = await apiAction(
    async () => {
      await api('customer', '/v1/identity/me', { method: 'PUT', body: phone.data });
      await api('customer', '/v1/identity/me/addresses', { method: 'POST', body: address.data });
    },
    'Saved',
    '/account',
  );
  if (result.error) return result;
  redirect(safeNext(form.get('next'), '/account', '/account'));
}

export async function skipWelcomeAction(form: FormData): Promise<never> {
  (await cookies()).set(WELCOME_SKIPPED, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 86400,
  });
  redirect(safeNext(form.get('next'), '/account', '/account'));
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession('customer');
  if (!session) redirect('/account/sign-in');
  const proposed = customerPasswordSchema.safeParse(form.get('password'));
  if (!proposed.success)
    return { fieldErrors: { password: proposed.error.issues[0]?.message ?? 'Invalid password' } };
  if (form.get('confirm') !== proposed.data)
    return { fieldErrors: { confirm: 'Passwords do not match' } };
  try {
    await changePassword(session.accessToken, text(form, 'current'), proposed.data);
  } catch (err) {
    const name = (err as { name?: string }).name;
    return {
      error:
        name === 'NotAuthorizedException'
          ? 'Your current password is incorrect.'
          : authErrorMessage(err),
    };
  }
  return { ok: 'Password changed.' };
}
