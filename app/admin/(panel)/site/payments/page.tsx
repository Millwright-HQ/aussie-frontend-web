import type { BankDetails } from '@aussie/shared-types';
import { Alert, Card, Field, Input, PageHeader, Textarea } from '@/app/admin/_ui';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { SiteTabs } from '../tabs';
import { saveBankDetailsAction, savePaymentWindowAction } from './actions';

export const metadata = { title: 'Payment configuration' };

export default async function PaymentsPage() {
  const me = await requirePermission('order:read');
  const canEdit = can(me, 'settings:write');
  const bank = await api<BankDetails | null>('admin', '/v1/orders/admin/bank-details');
  const { windowHours } = await api<{ windowHours: number }>(
    'admin',
    '/v1/orders/admin/payment-settings',
  );

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Site settings"
        description="Payment configuration: cash on delivery is always available. Add your bank account to also offer bank transfer. Customers see these details after placing an order, upload their payment slip, and the order is confirmed once you approve the slip."
      />
      <SiteTabs me={me} current="/admin/site/payments" />
      {!bank && (
        <Alert tone="info">
          Bank transfer is switched off until you save your bank details below.
        </Alert>
      )}
      <Card>
        <h2 className="text-[15px] font-semibold">Bank account for transfers</h2>
        {canEdit ? (
          <ActionForm
            action={saveBankDetailsAction}
            submitLabel="Save bank details"
            className="mt-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="accountName" label="Account name" className="sm:col-span-2">
                <Input
                  id="accountName"
                  name="accountName"
                  defaultValue={bank?.accountName}
                  maxLength={100}
                  required
                />
              </Field>
              <Field id="bankName" label="Bank">
                <Input
                  id="bankName"
                  name="bankName"
                  defaultValue={bank?.bankName}
                  maxLength={100}
                  required
                />
              </Field>
              <Field id="branch" label="Branch">
                <Input
                  id="branch"
                  name="branch"
                  defaultValue={bank?.branch}
                  maxLength={100}
                  required
                />
              </Field>
              <Field id="accountNumber" label="Account number" className="sm:col-span-2">
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  inputMode="numeric"
                  defaultValue={bank?.accountNumber}
                  maxLength={30}
                  required
                />
              </Field>
              <Field
                id="instructions"
                label="Instructions for customers"
                hint="For example: use your order number as the payment reference"
                optional
                className="sm:col-span-2"
              >
                <Textarea
                  id="instructions"
                  name="instructions"
                  rows={2}
                  maxLength={300}
                  defaultValue={bank?.instructions}
                />
              </Field>
            </div>
          </ActionForm>
        ) : bank ? (
          <dl className="mt-4 space-y-1 text-sm">
            <div>{bank.accountName}</div>
            <div>
              {bank.bankName}, {bank.branch}
            </div>
            <div className="tabular">{bank.accountNumber}</div>
            <p className="pt-2 text-muted">Your role can view this but not change it.</p>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">Not set up yet.</p>
        )}
        {bank?.updatedAt && (
          <p className="mt-3 text-xs text-muted">Last saved {formatDateTime(bank.updatedAt)}</p>
        )}
      </Card>
      <Card>
        <h2 className="text-[15px] font-semibold">Unpaid bank-transfer orders</h2>
        <p className="mt-1 text-sm text-muted">
          A customer who orders by bank transfer holds the stock until they pay. If no payment slip
          arrives we send one reminder halfway through this time, then cancel the order and put the
          stock back. A rejected slip restarts the time.
        </p>
        {canEdit ? (
          <ActionForm action={savePaymentWindowAction} submitLabel="Save" className="mt-4">
            <Field
              id="windowHours"
              label="Hours to pay"
              hint="0 means never cancel automatically. The check runs every hour."
            >
              <Input
                id="windowHours"
                name="windowHours"
                type="number"
                min={0}
                max={720}
                defaultValue={windowHours}
                required
                hasHint
              />
            </Field>
          </ActionForm>
        ) : (
          <p className="mt-3 text-sm">
            {windowHours === 0 ? 'Never cancelled automatically.' : `${windowHours} hours to pay.`}
          </p>
        )}
      </Card>
    </div>
  );
}
