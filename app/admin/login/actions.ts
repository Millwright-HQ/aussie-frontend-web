'use server';

import { adminPasswordSchema, emailSchema, sixDigitCodeSchema } from '@aussie/validation';
import { redirect, unstable_rethrow } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { adminHasAuthenticator } from '@/lib/auth/mfa';
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
  getSession,
  markMfaVerified,
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
async function advance(
  step: AuthStep,
  email: string,
  next: string,
  firstSignIn = false,
): Promise<never> {
  switch (step.kind) {
    case 'tokens': {
      // The authenticator app is checked here, by us, so it works the same on every environment
      // (the local emulator ignores Cognito's per-user second step). If we cannot tell, we do not
      // sign them in: fail closed.
      const hasApp = await adminHasAuthenticator(step.tokens.AccessToken);
      if (hasApp === null) throw new Error('AUTHENTICATOR_STATUS_UNKNOWN');
      await writeSession('admin', step.tokens, step.username, { mfaPending: hasApp });
      if (hasApp) return redirect(`/admin/login/verify?next=${encodeURIComponent(next)}`);
      // First sign-in: offer the authenticator app (optional), then continue to where they were going.
      return redirect(
        firstSignIn
          ? `/admin/profile?tab=security&welcome=1&next=${encodeURIComponent(next)}`
          : next,
      );
    }
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

/** `advance` always redirects; anything else it throws becomes a message instead of a crash page. */
async function finish(
  step: AuthStep,
  email: string,
  next: string,
  firstSignIn = false,
): Promise<FormState> {
  try {
    return await advance(step, email, next, firstSignIn);
  } catch (err) {
    unstable_rethrow(err); // the redirect itself
    return { error: 'We could not finish signing you in right now. Please try again.' };
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
  return finish(step, email.data, next);
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
  return finish(step, flow.email ?? '', flow.next ?? '/admin', true);
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
  return finish(step, flow.email ?? '', flow.next ?? '/admin');
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
  return finish(step, flow.email ?? '', flow.next ?? '/admin');
}

/** Second step for admins with the authenticator app on: the 6-digit code from the app. */
export async function verifyAppCode(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession('admin', { allowPending: true });
  if (!session) return { error: EXPIRED };
  const next = safeNext(form.get('next'), '/admin', '/admin');
  if (!session.mfaPending) redirect(next);
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { fieldErrors: { code: 'Enter the 6-digit code from your app' } };
  try {
    await api('admin', '/v1/identity/admin/me/authenticator/verify', {
      method: 'POST',
      body: { code: code.data },
      allowPendingMfa: true,
    });
  } catch (err) {
    if (err instanceof ApiError) return { fieldErrors: { code: err.userMessage } };
    throw err;
  }
  await markMfaVerified('admin');
  redirect(next);
}

/** Abandons a sign-in that is waiting for its code (wrong account, lost phone). */
export async function cancelSignIn(): Promise<never> {
  const refresh = await readRefresh('admin');
  if (refresh) await revoke('admin', refresh.refreshToken).catch(() => undefined);
  await clearSession('admin');
  redirect('/admin/login');
}

export async function signOut(): Promise<never> {
  // Recorded first, while the session still works; a failure here must never block signing out.
  await api('admin', '/v1/identity/admin/session/signout', { method: 'POST' }).catch(
    () => undefined,
  );
  const refresh = await readRefresh('admin');
  if (refresh) await revoke('admin', refresh.refreshToken).catch(() => undefined);
  await clearSession('admin');
  redirect('/admin/login');
}
