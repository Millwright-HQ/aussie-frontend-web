import { redirect } from 'next/navigation';
import { LocalMailHint } from '@/components/local-mail-hint';
import { readFlow } from '@/lib/auth/session';
import { VerifyEmailForm } from '../forms';
import { AuthShell } from '../shell';

export const metadata = { title: 'Verify your email' };

/** Masks the address on screen: "s****@gmail.com". */
function mask(email: string) {
  const [user = '', domain = ''] = email.split('@');
  return `${user[0] ?? ''}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

export default async function VerifyPage() {
  const flow = await readFlow('customer');
  if (flow?.step !== 'verify-email' || !flow.email) redirect('/account/sign-up');
  return (
    <AuthShell
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${mask(flow.email)}. It expires in 24 hours.`}
    >
      <VerifyEmailForm />
      <LocalMailHint to={flow.email} />
    </AuthShell>
  );
}
