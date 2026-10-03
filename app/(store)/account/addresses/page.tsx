import { Card, formatLkPhone } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import { api } from '@/lib/api';
import { requireCustomerSession } from '@/lib/auth/session';
import { AccountLayout } from '../account-nav';
import { AddressActions, AddressForm, type AddressView } from '../forms';

export const metadata = { title: 'Addresses' };

const districtName = (code: string) => DISTRICTS.find((d) => d.code === code)?.name ?? code;

export default async function AddressesPage() {
  await requireCustomerSession('/account/addresses');
  const { items } = await api<{ items: AddressView[] }>('customer', '/v1/identity/me/addresses');

  return (
    <AccountLayout current="/account/addresses">
      <div className="space-y-6">
        <h2 className="text-h2">Delivery addresses</h2>
        {items.length === 0 && <p className="text-muted">No saved addresses yet.</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <li key={a.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.fullName}</p>
                  {a.isDefault && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-white">
                      Default
                    </span>
                  )}
                </div>
                <address className="mt-2 text-sm text-muted not-italic">
                  {a.line1}
                  {a.line2 && <>, {a.line2}</>}
                  <br />
                  {a.city}, {districtName(a.district)}
                  {a.postalCode && <> {a.postalCode}</>}
                  <br />
                  <span className="tabular">{formatLkPhone(a.phone)}</span>
                </address>
                <div className="mt-4 space-y-3">
                  <AddressActions id={a.id} isDefault={a.isDefault} />
                  <details>
                    <summary className="cursor-pointer text-sm">Edit</summary>
                    <div className="mt-4">
                      <AddressForm address={a} />
                    </div>
                  </details>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        {items.length < 10 && (
          <Card>
            <h3 className="text-h3">Add an address</h3>
            <div className="mt-4">
              <AddressForm />
            </div>
          </Card>
        )}
      </div>
    </AccountLayout>
  );
}
