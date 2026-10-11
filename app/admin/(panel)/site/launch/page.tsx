import type { SiteLockAdmin } from '@aussie/shared-types';
import { Alert, Card, Field, Input, PageHeader, Textarea } from '@/app/admin/_ui';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../../action-form';
import { saveSiteLockAction } from '../actions';
import { SiteTabs } from '../tabs';

export const metadata = { title: 'Launch lock' };

export default async function LaunchLockPage() {
  const me = await requirePermission('content:write');
  const lock = await api<SiteLockAdmin>('admin', '/v1/content/admin/site-lock');

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Launch lock"
        description="Hide the shop from the public until you are ready to launch. Visitors see a coming-soon page and can get in with the password you set. The admin panel is never locked."
      />
      <SiteTabs me={me} current="/admin/site/launch" />

      {lock.enabled && (
        <Alert className="mb-4" tone="warning">
          The shop is locked right now. Visitors need the password to see it.
        </Alert>
      )}

      <ActionForm action={saveSiteLockAction} submitLabel="Save" className="space-y-6">
        <Card>
          <label className="flex min-h-10 items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={lock.enabled}
              className="mt-1 size-5 accent-primary"
            />
            <span>
              Lock the shop until launch
              <span className="block text-xs text-muted">
                Switch this off on launch day to open the shop to everyone.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="password"
              label={lock.hasPassword ? 'New password' : 'Password'}
              hint={
                lock.hasPassword
                  ? 'Leave empty to keep the current password. A new one signs everyone out of the locked shop.'
                  : 'At least 6 characters. Share it with the people who should see the shop early.'
              }
              optional={lock.hasPassword}
            >
              <Input
                id="password"
                name="password"
                type="text"
                autoComplete="off"
                minLength={6}
                maxLength={100}
              />
            </Field>
            <Field
              id="message"
              label="Message on the coming-soon page"
              optional
              className="sm:col-span-2"
            >
              <Textarea
                id="message"
                name="message"
                rows={2}
                maxLength={300}
                defaultValue={lock.message}
                placeholder="We are getting ready to open. Please check back soon."
              />
            </Field>
          </div>
          {lock.updatedAt && (
            <p className="mt-3 text-xs text-muted">Last changed {formatDateTime(lock.updatedAt)}</p>
          )}
        </Card>
      </ActionForm>
    </div>
  );
}
