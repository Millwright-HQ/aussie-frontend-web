import { Alert, Card } from '@aussie/ui';
import { api, ApiError } from '@/lib/api';
import { requireCustomerSession } from '@/lib/auth/session';
import { AccountLayout } from './account-nav';
import { ProfileForm, type ProfileView } from './forms';

export const metadata = { title: 'My account' };

export default async function AccountPage() {
  await requireCustomerSession('/account');
  const profile = await api<ProfileView>('customer', '/v1/identity/me').catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });

  return (
    <AccountLayout current="/account">
      <Card>
        <h2 className="text-h2">Profile</h2>
        <div className="mt-6">
          {profile ? (
            <ProfileForm profile={profile} />
          ) : (
            <Alert>We couldn't load your profile. Please try again in a minute.</Alert>
          )}
        </div>
      </Card>
    </AccountLayout>
  );
}
