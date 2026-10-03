import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { SignUpForm } from '../forms';
import { AuthShell } from '../shell';

export const metadata = { title: 'Create account' };

export default async function SignUpPage() {
  if (await getSession('customer')) redirect('/account');
  return (
    <AuthShell
      title="Create your account"
      subtitle="Step 1 of 2 · We'll email you a code to confirm it's you."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/account/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
