import { Alert } from '@aussie/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession, safeNext } from '@/lib/auth/session';
import { SignInForm } from '../forms';
import { AuthShell } from '../shell';

export const metadata = { title: 'Sign in' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string; reset?: string }>;
}) {
  const { next, verified, reset } = await searchParams;
  const target = safeNext(next, '/account', '/account');
  if (await getSession('customer')) redirect(target);
  return (
    <AuthShell
      title="Sign in"
      subtitle="Track orders and check out faster."
      footer={
        <>
          New here?{' '}
          <Link
            href="/account/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {verified && (
        <Alert tone="success" className="mb-5">
          Your email is verified. Sign in to add your delivery details.
        </Alert>
      )}
      {reset && (
        <Alert tone="success" className="mb-5">
          Password updated. Sign in with your new password.
        </Alert>
      )}
      <SignInForm next={target} />
    </AuthShell>
  );
}
