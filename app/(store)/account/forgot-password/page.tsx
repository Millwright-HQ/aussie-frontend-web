import Link from 'next/link';
import { readFlow } from '@/lib/auth/session';
import { ForgotPasswordForm, ResetPasswordForm } from '../forms';
import { AuthShell } from '../shell';

export const metadata = { title: 'Reset password' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const flow = await readFlow('customer');
  const awaitingCode = Boolean(sent) && flow?.step === 'reset-password';
  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        awaitingCode
          ? 'If an account exists for that email, we sent a 6-digit code. Enter it with a new password.'
          : "Enter your email and we'll send you a code."
      }
      footer={
        <Link href="/account/sign-in" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {awaitingCode ? <ResetPasswordForm /> : <ForgotPasswordForm />}
    </AuthShell>
  );
}
