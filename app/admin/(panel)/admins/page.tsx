import { Card, Field, Input, Select } from '@aussie/ui';
import { type AdminRow, formatDateTime, requirePermission, type RoleRow } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import { changeRole, inviteAdmin, setAdminStatus } from '../actions';

export const metadata = { title: 'Admins' };

export default async function AdminsPage() {
  const me = await requirePermission('admin:manage');
  const [{ items: admins }, { items: roles }] = await Promise.all([
    api<{ items: AdminRow[] }>('admin', '/v1/identity/admin/admins'),
    api<{ items: RoleRow[] }>('admin', '/v1/identity/admin/roles'),
  ]);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Admins</h1>
        <p className="mt-1 text-muted">
          New admins get a temporary password by email and must set up an authenticator app on first
          sign-in.
        </p>
      </div>

      <Card>
        <h2 className="text-h3">Invite an admin</h2>
        <ActionForm action={inviteAdmin} submitLabel="Send invitation" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field id="invite-name" label="Full name">
              <Input id="invite-name" name="name" required autoComplete="off" />
            </Field>
            <Field id="invite-email" label="Email">
              <Input id="invite-email" name="email" type="email" required autoComplete="off" />
            </Field>
            <Field id="invite-role" label="Role">
              <Select id="invite-role" name="roleId" required defaultValue="">
                <option value="" disabled>
                  Choose a role
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </ActionForm>
      </Card>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((a) => {
              const self = a.sub === me.sub;
              return (
                <tr key={a.sub} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {a.name} {self && <span className="text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-muted">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">{roleName(a.roleId)}</td>
                  <td className="px-4 py-3">
                    <span className={a.status === 'ACTIVE' ? 'text-success' : 'text-danger'}>
                      {a.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(a.lastLoginAt)}</td>
                  <td className="space-y-2 px-4 py-3">
                    {self ? (
                      <p className="text-xs text-muted">
                        Another admin must change your role or status.
                      </p>
                    ) : (
                      <>
                        <ActionForm
                          action={changeRole}
                          submitLabel="Change"
                          size="sm"
                          variant="outline"
                          inline
                        >
                          <input type="hidden" name="sub" value={a.sub} />
                          <label className="sr-only" htmlFor={`role-${a.sub}`}>
                            Role for {a.name}
                          </label>
                          <Select
                            id={`role-${a.sub}`}
                            name="roleId"
                            defaultValue={a.roleId}
                            className="min-h-9 w-44"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </Select>
                        </ActionForm>
                        <details>
                          <summary className="cursor-pointer text-xs text-muted">
                            {a.status === 'ACTIVE' ? 'Disable…' : 'Enable…'}
                          </summary>
                          <ActionForm
                            action={setAdminStatus}
                            submitLabel={
                              a.status === 'ACTIVE' ? `Disable ${a.name}` : `Enable ${a.name}`
                            }
                            variant={a.status === 'ACTIVE' ? 'danger' : 'secondary'}
                            size="sm"
                            className="mt-2"
                          >
                            <input type="hidden" name="sub" value={a.sub} />
                            <input
                              type="hidden"
                              name="action"
                              value={a.status === 'ACTIVE' ? 'disable' : 'enable'}
                            />
                          </ActionForm>
                        </details>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
