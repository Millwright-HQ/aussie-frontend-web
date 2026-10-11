import { type Banner, type InfoPage, type SiteSettings } from '@aussie/shared-types';
import { Card, Field, Input, PageHeader, Select } from '@/app/admin/_ui';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import { saveSettingsAction } from './actions';
import { SiteTabs } from './tabs';

export const metadata = { title: 'Site settings' };

interface AdminSite {
  settings: SiteSettings;
  banners: Banner[];
  pages: InfoPage[];
}

const Check = ({
  name,
  label,
  checked,
  hint,
}: {
  name: string;
  label: string;
  checked: boolean;
  hint?: string;
}) => (
  <label className="flex min-h-10 items-start gap-3 text-sm">
    <input
      type="checkbox"
      name={name}
      defaultChecked={checked}
      className="mt-1 size-5 accent-primary"
    />
    <span>
      {label}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </span>
  </label>
);

export default async function SiteSettingsPage() {
  const me = await requirePermission('content:write');
  const { settings: s } = await api<AdminSite>('admin', '/v1/content/admin/site');

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Site settings"
        description="Everything customers see around your products: contact details, the announcement bar, the default theme and what appears on the home page. Changes show on the shop within a minute."
      />
      <SiteTabs me={me} current="/admin/site" />

      <ActionForm action={saveSettingsAction} submitLabel="Save settings" className="space-y-6">
        <Card>
          <h2 className="text-[15px] font-semibold">Store details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="tagline"
              label="Tagline"
              hint="A short line under your name on the home page and footer"
              optional
              className="sm:col-span-2"
            >
              <Input id="tagline" name="tagline" defaultValue={s.tagline} maxLength={120} hasHint />
            </Field>
            <Field id="phone" label="Phone" optional>
              <Input id="phone" name="phone" type="tel" defaultValue={s.phone} />
            </Field>
            <Field id="whatsapp" label="WhatsApp number" hint="A Sri Lankan mobile number" optional>
              <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={s.whatsapp} hasHint />
            </Field>
            <Field id="email" label="Email" optional>
              <Input id="email" name="email" type="email" defaultValue={s.email} />
            </Field>
            <Field id="address" label="Address" optional>
              <Input id="address" name="address" defaultValue={s.address} maxLength={200} />
            </Field>
            <Field
              id="footerNote"
              label="Footer note"
              hint="For example your opening hours"
              optional
              className="sm:col-span-2"
            >
              <Input
                id="footerNote"
                name="footerNote"
                defaultValue={s.footerNote}
                maxLength={200}
                hasHint
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold">Social links</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ['facebook', 'Facebook', s.facebook],
                ['instagram', 'Instagram', s.instagram],
                ['tiktok', 'TikTok', s.tiktok],
                ['youtube', 'YouTube', s.youtube],
              ] as const
            ).map(([name, label, value]) => (
              <Field key={name} id={name} label={label} hint="Starts with https://" optional>
                <Input id={name} name={name} type="url" defaultValue={value} hasHint />
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold">Announcement bar</h2>
          <p className="mt-1 text-sm text-muted">The thin bar at the very top of every page.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Check
                name="announcementEnabled"
                label="Show the announcement bar"
                checked={s.announcement.enabled}
              />
            </div>
            <Field id="announcementText" label="Text" className="sm:col-span-2">
              <Input
                id="announcementText"
                name="announcementText"
                defaultValue={s.announcement.text}
                maxLength={160}
              />
            </Field>
            <Field
              id="announcementHref"
              label="Link"
              hint="A page like /shop, or an address starting with https://"
              optional
              className="sm:col-span-2"
            >
              <Input
                id="announcementHref"
                name="announcementHref"
                defaultValue={s.announcement.href}
                hasHint
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold">Appearance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="defaultMode"
              label="Theme for new visitors"
              hint="Visitors can switch with the sun/moon button and we remember their choice"
              className="sm:col-span-2"
            >
              <Select id="defaultMode" name="defaultMode" defaultValue={s.theme.defaultMode}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold">Home page sections</h2>
          <div className="mt-2 space-y-1">
            <Check name="showCategories" label="Shop by category" checked={s.home.showCategories} />
            <Check name="showNewIn" label="New in (latest products)" checked={s.home.showNewIn} />
            <Check
              name="showTrustBar"
              label="Trust bar (payment, delivery, genuine products)"
              checked={s.home.showTrustBar}
            />
          </div>
          <p className="mt-2 text-xs text-muted">The slider at the top is managed under Banners.</p>
        </Card>

        {s.updatedAt && (
          <p className="text-xs text-muted">Last saved {formatDateTime(s.updatedAt)}</p>
        )}
      </ActionForm>
    </div>
  );
}
