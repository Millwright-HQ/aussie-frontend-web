import { KeyRound, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from 'lucide-react';
import { type AdminRow, formatDateTime, requirePermission, type RoleRow } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import {
  changeRole,
  deleteAdmin,
  inviteAdmin,
  resetAdminPassword,
  setAdminStatus,
} from '../actions';
import {
  Avatar,
  Badge,
  Checkbox,
  ConfirmAction,
  Field,
  Input,
  PageHeader,
  Panel,
  RowActions,
  Select,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';

export const metadata = { title: 'Admins' };

export default async function AdminsPage() {
  const me = await requirePermission('admin:manage');
  const [{ items: admins }, { items: roles }] = await Promise.all([
    api<{ items: AdminRow[] }>('admin', '/v1/identity/admin/admins'),
    api<{ items: RoleRow[] }>('admin', '/v1/identity/admin/roles'),
  ]);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="New admins get a temporary password by email. On first sign-in they can turn on the authenticator app from their profile, or do it later."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <TableShell className="self-start">
          <Table>
            <Thead>
              <tr>
                <Th>Admin</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last sign-in</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </Thead>
            <Tbody>
              {admins.map((a) => {
                const self = a.sub === me.sub;
                return (
                  <Tr key={a.sub} className="align-top">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} {...(a.avatar ? { src: a.avatar } : {})} size={40} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {a.name} {self && <span className="text-xs font-normal text-muted">(you)</span>}
                          </p>
                          <p className="truncate text-[13px] text-muted">{a.email}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                            {a.totpEnabled ? (
                              <>
                                <ShieldCheck aria-hidden size={12} className="text-success" /> Authenticator on
                              </>
                            ) : (
                              <>
                                <ShieldOff aria-hidden size={12} /> Authenticator off
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {self ? (
                        <span>{roleName(a.roleId)}</span>
                      ) : (
                        <ActionForm action={changeRole} submitLabel="Save" size="sm" variant="outline" inline>
                          <input type="hidden" name="sub" value={a.sub} />
                          <label className="sr-only" htmlFor={`role-${a.sub}`}>
                            Role for {a.name}
                          </label>
                          <Select id={`role-${a.sub}`} name="roleId" defaultValue={a.roleId} className="h-9 w-44">
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </Select>
                        </ActionForm>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={a.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {a.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(a.lastLoginAt)}</Td>
                    <Td>
                      {self ? (
                        <p className="text-right text-xs text-muted">Another admin manages your account.</p>
                      ) : (
                        <RowActions>
                          <ConfirmAction
                            iconOnly
                            tone="primary"
                            action={setAdminStatus}
                            fields={{ sub: a.sub, action: a.status === 'ACTIVE' ? 'disable' : 'enable' }}
                            label={a.status === 'ACTIVE' ? `Disable ${a.name}` : `Enable ${a.name}`}
                            title={a.status === 'ACTIVE' ? `Disable ${a.name}?` : `Enable ${a.name}?`}
                            description={
                              a.status === 'ACTIVE'
                                ? 'They are signed out everywhere and cannot sign in until you enable them again.'
                                : 'They can sign in again with their existing password.'
                            }
                            confirmLabel={a.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          >
                            {a.status === 'ACTIVE' ? (
                              <UserX aria-hidden size={16} />
                            ) : (
                              <UserCheck aria-hidden size={16} />
                            )}
                          </ConfirmAction>
                          {a.status === 'ACTIVE' && (
                            <ConfirmAction
                              iconOnly
                              tone="primary"
                              action={resetAdminPassword}
                              fields={{ sub: a.sub }}
                              label={`Reset password for ${a.name}`}
                              title={`Reset ${a.name}'s password?`}
                              description="They are signed out and emailed a new temporary password."
                              confirmLabel="Reset password"
                              extra={
                                <Checkbox
                                  id={`reset-auth-${a.sub}`}
                                  name="resetAuthenticator"
                                  label="Also turn off their authenticator app (lost phone)"
                                />
                              }
                            >
                              <KeyRound aria-hidden size={16} />
                            </ConfirmAction>
                          )}
                          <ConfirmAction
                            iconOnly
                            action={deleteAdmin}
                            fields={{ sub: a.sub }}
                            label={`Delete ${a.name}`}
                            title={`Delete ${a.name} permanently?`}
                            description="Removes their sign-in and profile. This cannot be undone. Their past actions stay in the audit log."
                            confirmLabel="Delete admin"
                          >
                            <Trash2 aria-hidden size={16} />
                          </ConfirmAction>
                        </RowActions>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableShell>

        <Panel title="Invite an admin" className="self-start">
          <ActionForm action={inviteAdmin} submitLabel="Send invitation">
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
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
