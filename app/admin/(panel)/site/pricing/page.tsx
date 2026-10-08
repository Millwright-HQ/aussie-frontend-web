import type { SiteDiscount } from '@aussie/shared-types';
import { MAX_SITE_DISCOUNT_PERCENT } from '@aussie/validation';
import { Alert, Card, Field, Input, PageHeader } from '@/app/admin/_ui';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { SiteTabs } from '../tabs';
import { saveSiteDiscountAction } from './actions';

export const metadata = { title: 'Pricing and discount' };

export default async function PricingPage() {
  const me = await requirePermission('product:read');
  const canEdit = can(me, 'settings:write');
  const discount = await api<SiteDiscount>('admin', '/v1/catalog/admin/pricing');

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Site settings"
        description="Pricing and discount: one percentage taken off every price in the shop. Shoppers see the old price crossed out; checkout charges the discounted price. Your product prices are not changed, so setting it to 0 brings them straight back."
      />
      <SiteTabs me={me} current="/admin/site/pricing" />
      {discount.percent > 0 && (
        <Alert tone="info">
          A {discount.percent}% discount is on for the whole shop right now.
        </Alert>
      )}
      <Card>
        <h2 className="text-[15px] font-semibold">Store-wide discount</h2>
        {canEdit ? (
          <ActionForm action={saveSiteDiscountAction} submitLabel="Save" className="mt-4">
            <Field
              id="percent"
              label="Discount (%)"
              hint={`A whole number from 0 to ${MAX_SITE_DISCOUNT_PERCENT}. 0 means no discount.`}
            >
              <Input
                id="percent"
                name="percent"
                type="number"
                min={0}
                max={MAX_SITE_DISCOUNT_PERCENT}
                step={1}
                defaultValue={discount.percent}
                required
                hasHint
              />
            </Field>
          </ActionForm>
        ) : (
          <p className="mt-3 text-sm">
            {discount.percent === 0 ? 'No discount.' : `${discount.percent}% off everything.`}{' '}
            <span className="text-muted">Your role can view this but not change it.</span>
          </p>
        )}
        {discount.updatedAt && (
          <p className="mt-3 text-xs text-muted">Last saved {formatDateTime(discount.updatedAt)}</p>
        )}
      </Card>
    </div>
  );
}
