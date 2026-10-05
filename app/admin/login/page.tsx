import { LocalMailHint } from '@/components/local-mail-hint';
import { BackendStatus } from '../backend-status';
import { signIn } from './actions';
import { AuthCard } from './auth-card';
import { AuthForm } from './auth-form';

export const metadata = { title: 'Admin sign in' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="Sign in"
      subtitle="Sign in with your email and password. If your authenticator app is on, you will be asked for a code next."
      footer={
        <>
          <BackendStatus />
          <LocalMailHint />
        </>
      }
    >
      <AuthForm
        action={signIn}
        submitLabel="Continue"
        hidden={next ? { next } : undefined}
        fields={[
          { id: 'email', label: 'Email', type: 'email', autoComplete: 'username' },
          { id: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
        ]}
      />
    </AuthCard>
  );
}
