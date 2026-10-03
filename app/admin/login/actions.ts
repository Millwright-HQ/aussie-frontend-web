'use server';

import { adminPasswordSchema, emailSchema, sixDigitCodeSchema } from '@aussie/validation';
import { redirect } from 'next/navigation';
import {
  answerTotp,
  authErrorMessage,
  type AuthStep,
  beginTotpSetup,
  completeNewPassword,
  finishTotpSetup,
  revoke,
  signInWithPassword,
} from '@/lib/auth/cognito';
import {
  clearSession,
  clientContext,
  readFlow,
  readRefresh,
  safeNext,
  writeFlow,
  writeSession,
} from '@/lib/auth/session';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EXPIRED = 'Your sign-in session expired. Please start again.';

/** Moves the user to the next sign-in screen, or finishes sign-in. Always redirects. */
async function advance(step: AuthStep, email: string, next: string): Promise<never> {
  switch (step.kind) {
    case 'tokens':
      await writeSession('admin', step.tokens, step.username);
      return redirect(next);
    case 'new-password':
      await writeFlow('admin', {
        step: 'new-password',
        session: step.session,
        username: step.username,
        email,
        next,
      });
      return redirect('/admin/login/new-password');
    case 'mfa-setup': {
      const { secret, session } = await beginTotpSetup(step.session);
      await writeFlow('admin', {
        step: 'mfa-setup',
        session,
        username: step.username,
        email,
        totpSecret: secret,
        next,
      });
      return redirect('/admin/login/setup-authenticator');
    }
    case 'totp':
      await writeFlow('admin', {
        step: 'totp',
        session: step.session,
        username: step.username,
        email,
        next,
      });
      return redirect('/admin/login/verify');
  }
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get('email'));
  const password = String(form.get('password') ?? '');
  if (!email.success || !password) return { error: 'Enter your email and password.' };
  const next = safeNext(form.get('next'), '/admin', '/admin');

  let step: AuthStep;
  try {
    step = await signInWithPassword('admin', email.data, password, await clientContext());
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return advance(step, email.data, next);
}

export async function setNewPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const flow = await readFlow('admin');
  if (flow?.step !== 'new-password' || !flow.session || !flow.username) return { error: EXPIRED };

  const parsed = adminPasswordSchema.safeParse(form.get('password'));
  if (!parsed.success)
    return { fieldErrors: { password: parsed.error.issues[0]?.message ?? 'Invalid password' } };
  if (form.get('confirm') !== parsed.data)
    return { fieldErrors: { confirm: 'Passwords do not match' } };

  let step: AuthStep;
  try {
    step = await completeNewPassword(
      flow.session,
      flow.username,
      parsed.data,
      await clientContext(),
    );
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return advance(step, flow.email ?? '', flow.next ?? '/admin');
}

export async function confirmAuthenticator(_prev: FormState, form: FormData): Promise<FormState> {
  const flow = await readFlow('admin');
  if (flow?.step !== 'mfa-setup' || !flow.session || !flow.username) return { error: EXPIRED };
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { fieldErrors: { code: 'Enter the 6-digit code from your app' } };

  let step: AuthStep;
  try {
    step = await finishTotpSetup(flow.session, flow.username, code.data, await clientContext());
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return advance(step, flow.email ?? '', flow.next ?? '/admin');
}

export async function verifyCode(_prev: FormState, form: FormData): Promise<FormState> {
  const flow = await readFlow('admin');
  if (flow?.step !== 'totp' || !flow.session || !flow.username) return { error: EXPIRED };
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { fieldErrors: { code: 'Enter the 6-digit code from your app' } };

  let step: AuthStep;
  try {
    step = await answerTotp(flow.session, flow.username, code.data, await clientContext());
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  return advance(step, flow.email ?? '', flow.next ?? '/admin');
}

export async function signOut(): Promise<never> {
  const refresh = await readRefresh('admin');
  if (refresh) await revoke('admin', refresh.refreshToken).catch(() => undefined);
  await clearSession('admin');
  redirect('/admin/login');
}
