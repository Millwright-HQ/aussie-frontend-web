import { redirect } from 'next/navigation';
import { getSession, readFlow, safeNext } from '@/lib/auth/session';
import { cancelSignIn, verifyAppCode, verifyCode } from '../actions';
import { AuthCard } from '../auth-card';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Enter your code' };

const CODE_FIELD = {
  id: 'code',
  label: '6-digit code',
  inputMode: 'numeric',
  autoComplete: 'one-time-code',
  pattern: '[0-9]{6}',
  maxLength: 6,
} as const;

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Authenticator app switched on in the profile: password accepted, code still to enter.
  const session = await getSession('admin', { allowPending: true });
  if (session?.mfaPending) {
    return (
      <AuthCard
        title="Enter your code"
        subtitle="Your authenticator app is on. Open it and enter the current 6-digit code for Aussie Admin."
        footer={
          <form action={cancelSignIn} className="text-center">
            <button
              type="submit"
              className="text-[13px] text-muted underline-offset-4 hover:underline"
            >
              Use a different account
            </button>
          </form>
        }
      >
        <AuthForm
          action={verifyAppCode}
          submitLabel="Verify and sign in"
          hidden={{ next: safeNext(next, '/admin', '/admin') }}
          fields={[CODE_FIELD]}
        />
      </AuthCard>
    );
  }
  // Cognito's own second step (only if the pool is ever set to require it).
  const flow = await readFlow('admin');
  if (flow?.step !== 'totp') redirect('/admin/login');
  return (
    <AuthCard
      title="Enter your code"
      subtitle="Open your authenticator app and enter the current 6-digit code."
    >
      <AuthForm action={verifyCode} submitLabel="Sign in" fields={[CODE_FIELD]} />
    </AuthCard>
  );
}
