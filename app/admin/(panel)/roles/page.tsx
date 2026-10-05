import { Lock, Pencil, Trash2 } from 'lucide-react';
import { can, currentAdmin, PERMISSION_GROUPS, permissionLabel, type RoleRow } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import { deleteRole, saveRole } from '../actions';
import { Badge, Checkbox, ConfirmAction, Field, Input, PageHeader, Panel } from '@/app/admin/_ui';

export const metadata = { title: 'Roles' };

function RoleEditor({ role }: { role?: RoleRow | undefined }) {
  const key = role?.id ?? 'new';
  return (
    <ActionForm action={saveRole} submitLabel={role ? 'Save role' : 'Create role'}>
      {role && <input type="hidden" name="id" value={role.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`name-${key}`} label="Role name">
          <Input id={`name-${key}`} name="name" defaultValue={role?.name} required maxLength={60} />
        </Field>
        <Field id={`desc-${key}`} label="Description" optional>
          <Input id={`desc-${key}`} name="description" defaultValue={role?.description} maxLength={300} />
        </Field>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <legend className="mb-2 text-[13px] font-medium">Permissions</legend>
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.label} className="space-y-2 rounded-xl border border-border bg-surface-muted/30 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{g.label}</p>
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
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Built-in roles can't be changed. Custom roles combine any permissions; changes reach signed-in admins within 15 minutes."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((r) => (
          <Panel
            key={r.id}
            title={
              <span className="flex items-center gap-2">
                {r.name}
                {r.isSystem ? (
                  <Badge>
                    <Lock aria-hidden size={10} /> Built-in
                  </Badge>
                ) : (
                  <Badge tone="info">Custom</Badge>
                )}
              </span>
            }
            description={r.description}
          >
            <ul className="flex flex-wrap gap-1.5">
              {r.permissions.map((p) => (
                <li key={p} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">
                  {permissionLabel(p)}
                </li>
              ))}
            </ul>
            {editable && !r.isSystem && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary">
                    <Pencil aria-hidden size={14} /> Edit role
                  </summary>
                  <div className="mt-4">
                    <RoleEditor role={r} />
                  </div>
                </details>
                <ConfirmAction
                  action={deleteRole}
                  fields={{ id: r.id }}
                  title={`Delete “${r.name}”?`}
                  description="Only possible when no admin has this role."
                  confirmLabel="Delete role"
                  variant="danger-soft"
                >
                  <Trash2 aria-hidden size={14} /> Delete role
                </ConfirmAction>
              </div>
            )}
          </Panel>
        ))}
      </div>

      {editable && (
        <Panel title="New custom role" description="Pick exactly the permissions this job needs.">
          <RoleEditor />
        </Panel>
      )}
    </div>
  );
}
