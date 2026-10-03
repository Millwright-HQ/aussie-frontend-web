import { Card } from '@aussie/ui';
import { requireCustomerSession } from '@/lib/auth/session';
import { AccountLayout } from '../account-nav';
import { ChangePasswordForm } from '../forms';

export const metadata = { title: 'Password' };

export default async function SecurityPage() {
  await requireCustomerSession('/account/security');
  return (
    <AccountLayout current="/account/security">
      <Card>
        <h2 className="text-h2">Change password</h2>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </Card>
    </AccountLayout>
  );
}
