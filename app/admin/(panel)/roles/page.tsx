import { Card, Checkbox, Field, Input } from '@aussie/ui';
import { can, currentAdmin, PERMISSION_GROUPS, permissionLabel, type RoleRow } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import { deleteRole, saveRole } from '../actions';

export const metadata = { title: 'Roles' };

function RoleEditor({ role }: { role?: RoleRow }) {
  const key = role?.id ?? 'new';
  return (
    <ActionForm action={saveRole} submitLabel={role ? 'Save role' : 'Create role'} className="mt-4">
      {role && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`name-${key}`} label="Role name">
          <Input id={`name-${key}`} name="name" defaultValue={role?.name} required maxLength={60} />
        </Field>
        <Field id={`desc-${key}`} label="Description" optional>
          <Input
            id={`desc-${key}`}
            name="description"
            defaultValue={role?.description}
            maxLength={300}
          />
        </Field>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-sm font-medium">Permissions</legend>
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.label} className="space-y-2 rounded-sm border border-border p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{g.label}</p>
            {g.permissions.map((p) => (
              <Checkbox
                key={p}
                id={`${key}-${p}`}
                name="permissions"
                value={p}
                defaultChecked={role?.permissions.includes(p)}
                label={permissionLabel(p)}
              />
            ))}
          </div>
        ))}
      </fieldset>
    </ActionForm>
  );
}

export default async function RolesPage() {
  const me = await currentAdmin();
  const { items: roles } = await api<{ items: RoleRow[] }>('admin', '/v1/identity/admin/roles');
  const editable = can(me, 'role:manage');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Roles</h1>
        <p className="mt-1 text-muted">
          Built-in roles can't be changed. Custom roles combine any permissions; changes reach
          signed-in admins within 15 minutes.
        </p>
      </div>

      {editable && (
        <Card>
          <h2 className="text-h3">New custom role</h2>
          <RoleEditor />
        </Card>
      )}

      <ul className="space-y-4">
        {roles.map((r) => (
          <li key={r.id}>
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-h3">{r.name}</h2>
                <span className="text-xs text-muted">{r.isSystem ? 'Built-in' : 'Custom'}</span>
              </div>
              {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              <ul className="mt-3 flex flex-wrap gap-2">
                {r.permissions.map((p) => (
                  <li key={p} className="rounded-full bg-surface-muted px-3 py-1 text-xs">
                    {permissionLabel(p)}
                  </li>
                ))}
              </ul>
              {editable && !r.isSystem && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <details>
                    <summary className="cursor-pointer text-sm">Edit</summary>
                    <RoleEditor role={r} />
                  </details>
                  <details>
                    <summary className="cursor-pointer text-sm text-danger">Delete…</summary>
                    <ActionForm
                      action={deleteRole}
                      submitLabel={`Delete "${r.name}"`}
                      variant="danger"
                      size="sm"
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <p className="text-sm text-muted">
                        Only possible when no admin has this role.
                      </p>
                    </ActionForm>
                  </details>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
