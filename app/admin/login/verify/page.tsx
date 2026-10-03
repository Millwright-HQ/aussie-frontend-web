import { redirect } from 'next/navigation';
import { readFlow } from '@/lib/auth/session';
import { verifyCode } from '../actions';
import { AuthCard } from '../auth-card';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Enter your code' };

export default async function VerifyPage() {
  const flow = await readFlow('admin');
  if (flow?.step !== 'totp') redirect('/admin/login');
  return (
    <AuthCard
      title="Enter your code"
      subtitle="Open your authenticator app and enter the current 6-digit code."
    >
      <AuthForm
        action={verifyCode}
        submitLabel="Sign in"
        fields={[
          {
            id: 'code',
            label: '6-digit code',
            inputMode: 'numeric',
            autoComplete: 'one-time-code',
            pattern: '[0-9]{6}',
            maxLength: 6,
          },
        ]}
      />
    </AuthCard>
  );
}
