'use server';

import { sixDigitCodeSchema } from '@aussie/validation';
import { redirect } from 'next/navigation';
import { authErrorMessage, confirmTotpEnrolment, setTotpPreference } from '@/lib/auth/cognito';
import { requireAdminSession, safeNext } from '@/lib/auth/session';
import type { ActionState } from '../actions';

/** Confirms the first code from the authenticator app and turns the second step on. */
export async function enableAuthenticator(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireAdminSession();
  const code = sixDigitCodeSchema.safeParse(form.get('code'));
  if (!code.success) return { error: 'Enter the 6-digit code from your app.' };

  try {
    await confirmTotpEnrolment(session.accessToken, code.data);
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  const next = safeNext(form.get('next'), '/admin', '');
  redirect(next || '/admin/security?enabled=1');
}

export async function disableAuthenticator(): Promise<ActionState> {
  const session = await requireAdminSession();
  try {
    await setTotpPreference(session.accessToken, false);
  } catch (err) {
    return { error: authErrorMessage(err) };
  }
  redirect('/admin/security?disabled=1');
}
