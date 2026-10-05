import { ADMIN_PASSWORD_MIN } from '@aussie/validation';
import { redirect } from 'next/navigation';
import { readFlow } from '@/lib/auth/session';
import { setNewPassword } from '../actions';
import { AuthCard } from '../auth-card';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Set your password' };

export default async function NewPasswordPage() {
  const flow = await readFlow('admin');
  if (flow?.step !== 'new-password') redirect('/admin/login');
  return (
    <AuthCard
      wide
      title="Set your password"
      subtitle="Replace the temporary password you were emailed. Each requirement ticks off as you type."
    >
      <AuthForm
        action={setNewPassword}
        submitLabel="Save password"
        fields={[]}
        passwordPair={{ minLength: ADMIN_PASSWORD_MIN }}
      />
    </AuthCard>
  );
}
