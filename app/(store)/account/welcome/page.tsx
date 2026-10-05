import { safeNext, requireCustomerSession } from '@/lib/auth/session';
import { api } from '@/lib/api';
import { skipWelcomeAction } from '../actions';
import { getDistricts } from '@/lib/delivery';
import { WelcomeForm } from '../forms';
import { AuthShell } from '../shell';

async function openDistricts() {
  const open = await getDistricts();
  return open.length > 0 ? open : undefined;
}

export const metadata = { title: 'Your delivery details' };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await requireCustomerSession('/account/welcome');
  const next = safeNext((await searchParams).next, '/account', '/account');
  const profile = await api<{ name: string }>('customer', '/v1/identity/me').catch(() => ({
    name: '',
  }));
  return (
    <AuthShell
      wide
      title={`Welcome${profile.name ? `, ${profile.name.split(' ')[0]}` : ''}!`}
      subtitle="Step 2 of 2 · Add your mobile and delivery address so checkout takes seconds. We call this number to confirm Cash on Delivery orders."
      footer={
        <form action={skipWelcomeAction}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="text-primary underline-offset-4 hover:underline">
            Skip, I'll add it at checkout
          </button>
        </form>
      }
    >
      <WelcomeForm next={next} name={profile.name} districts={await openDistricts()} />
    </AuthShell>
  );
}
