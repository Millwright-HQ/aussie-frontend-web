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
    <AuthCard title="Set your password" subtitle="Replace the temporary password you were emailed.">
      <AuthForm
        action={setNewPassword}
        submitLabel="Save password"
        fields={[
          {
            id: 'password',
            label: 'New password',
            type: 'password',
            autoComplete: 'new-password',
            hint: 'At least 12 characters with upper and lower case, a number and a symbol.',
          },
          {
            id: 'confirm',
            label: 'Confirm password',
            type: 'password',
            autoComplete: 'new-password',
          },
        ]}
      />
    </AuthCard>
  );
}
