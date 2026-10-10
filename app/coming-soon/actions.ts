'use server';

import { siteLockVerifySchema } from '@aussie/validation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSecureCookies } from '@/lib/auth/config';
import { publicPost } from '@/lib/orders';
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE, unlockToken } from '@/lib/site-lock';

export interface UnlockState {
  error?: string;
}

/** Checks the launch password on the server and, if right, remembers it in a signed cookie. */
export async function unlockSiteAction(_prev: UnlockState, form: FormData): Promise<UnlockState> {
  const parsed = siteLockVerifySchema.safeParse({ password: form.get('password') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter the password' };

  const res = await publicPost<{ ok: boolean; version?: string }>(
    '/v1/content/site-lock/verify',
    parsed.data,
  );
  if (!res.ok) return { error: res.message };
  if (!res.data.ok) return { error: 'That password is not right. Please try again.' };

  if (res.data.version) {
    (await cookies()).set(UNLOCK_COOKIE, unlockToken(res.data.version), {
      httpOnly: true,
      secure: isSecureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: UNLOCK_MAX_AGE,
    });
  }
  redirect('/');
}
