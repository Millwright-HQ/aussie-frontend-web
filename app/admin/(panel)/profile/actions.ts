'use server';

import {
  ADMIN_PASSWORD_MIN,
  adminPasswordSchema,
  avatarSchema,
  emailSchema,
  nameSchema,
  sixDigitCodeSchema,
} from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { authErrorMessage, changePassword, passwordIsCorrect } from '@/lib/auth/cognito';
import { clientContext, requireAdminSession, safeNext } from '@/lib/auth/session';
import { currentAdmin } from '@/lib/admin';
import type { ActionState } from '../actions';

export interface PasswordState extends ActionState {
  fieldErrors?: Record<string, string>;
}

const done = () => revalidatePath('/admin', 'layout'); // the sidebar shows the name and picture

async function saveProfile(body: Record<string, unknown>, ok: string): Promise<ActionState> {
  try {
    await api('admin', '/v1/identity/admin/me/profile', { method: 'PUT', body });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  done();
  return { ok };
}

export async function saveNameAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = nameSchema.safeParse(form.get('name'));
  if (!name.success) return { error: name.error.issues[0]?.message ?? 'Enter your full name' };
  return saveProfile(
    { name: name.data },
    'Name updated. It shows everywhere from your next sign-in.',
  );
}

/** A new email changes how they sign in, so it needs the current password first. */
export async function saveEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailSchema.safeParse(form.get('email'));
  if (!email.success) return { error: email.error.issues[0]?.message ?? 'Enter a valid email' };
  const password = String(form.get('currentPassword') ?? '');
  if (!password) return { error: 'Enter your current password to change your email.' };
  const me = await currentAdmin();
  if (email.data === me.email) return { error: 'That is already your email.' };
  try {
    if (!(await passwordIsCorrect('admin', me.email, password, await clientContext()))) {
      return { error: 'That is not your current password.' };
    }
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return saveProfile(
    { email: email.data },
    `Email changed. Sign in with ${email.data} from now on.`,
  );
}

export async function saveAvatarAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (form.get('remove') === '1') return saveProfile({ avatar: null }, 'Picture removed.');
  const avatar = avatarSchema.safeParse(form.get('avatar'));
  if (!avatar.success)
    return { error: avatar.error.issues[0]?.message ?? 'Choose a picture first.' };
  return saveProfile({ avatar: avatar.data }, 'Picture updated.');
}

export async function changePasswordAction(
  _prev: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const session = await requireAdminSession();
  const current = String(form.get('currentPassword') ?? '');
  if (!current) return { fieldErrors: { currentPassword: 'Enter your current password' } };
  const proposed = adminPasswordSchema.safeParse(form.get('password'));
  if (!proposed.success) {
    return {
      fieldErrors: {
        password:
          proposed.error.issues[0]?.message ?? `Use at least ${ADMIN_PASSWORD_MIN} characters`,
      },
    };
  }
  if (form.get('confirm') !== proposed.data)
    return { fieldErrors: { confirm: 'Passwords do not match' } };
  if (proposed.data === current) {
    return { fieldErrors: { password: 'Choose a password different from the current one' } };
  }
  try {
    await changePassword(session.accessToken, current, proposed.data);
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'NotAuthorizedException') {
      return { fieldErrors: { currentPassword: 'That is not your current password' } };
    }
    return { error: authErrorMessage(err) };
  }
  // Recorded in the audit log (best effort: the password is already changed).
  await api('admin', '/v1/identity/admin/session/password-changed', { method: 'POST' }).catch(
    () => undefined,
  );
  return { ok: 'Password changed.' };
}

// ── Authenticator app ───────────────────────────────────────────────────────

export async function enableAuthenticator(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { error: 'Enter the 6-digit code from your app.' };
  try {
    await api('admin', '/v1/identity/admin/me/authenticator/confirm', {
      method: 'POST',
      body: { code: code.data },
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  done();
  const next = safeNext(form.get('next'), '/admin', '');
  redirect(next || '/admin/profile?tab=security&enabled=1');
}

export async function disableAuthenticator(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { error: 'Enter the current 6-digit code from your app.' };
  try {
    await api('admin', '/v1/identity/admin/me/authenticator/disable', {
      method: 'POST',
      body: { code: code.data },
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  done();
  redirect('/admin/profile?tab=security&disabled=1');
}
