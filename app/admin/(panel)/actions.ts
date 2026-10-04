'use server';

import { createAdminSchema, roleIdSchema, roleInputSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { api, ApiError } from '@/lib/api';

export interface ActionState {
  ok?: string;
  error?: string;
}

const subSchema = z.guid(); // Cognito subs are not always RFC-4122 UUIDs, so z.uuid() rejects some

async function call(fn: () => Promise<unknown>, ok: string, path: string): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath(path);
  return { ok };
}

// The API re-validates and authorises everything below; parsing here gives early, friendly errors.

export async function inviteAdmin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = createAdminSchema.safeParse({
    name: form.get('name'),
    email: form.get('email'),
    roleId: form.get('roleId'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return call(
    () => api('admin', '/v1/identity/admin/admins', { method: 'POST', body: parsed.data }),
    `Invitation sent to ${parsed.data.email}. They'll receive a temporary password by email.`,
    '/admin/admins',
  );
}

export async function changeRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sub = subSchema.safeParse(form.get('sub'));
  const roleId = roleIdSchema.safeParse(form.get('roleId'));
  if (!sub.success || !roleId.success) return { error: 'Invalid request' };
  return call(
    () =>
      api('admin', `/v1/identity/admin/admins/${sub.data}/role`, {
        method: 'PUT',
        body: { roleId: roleId.data },
      }),
    'Role updated. They will be signed out and get the new permissions on next sign-in.',
    '/admin/admins',
  );
}

export async function setAdminStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sub = subSchema.safeParse(form.get('sub'));
  const action = form.get('action') === 'enable' ? 'enable' : 'disable';
  if (!sub.success) return { error: 'Invalid request' };
  return call(
    () => api('admin', `/v1/identity/admin/admins/${sub.data}/${action}`, { method: 'POST' }),
    action === 'disable' ? 'Admin disabled and signed out everywhere.' : 'Admin re-enabled.',
    '/admin/admins',
  );
}

export async function resetAdminPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sub = subSchema.safeParse(form.get('sub'));
  if (!sub.success) return { error: 'Invalid request' };
  return call(
    () =>
      api('admin', `/v1/identity/admin/admins/${sub.data}/reset-password`, {
        method: 'POST',
        body: { resetAuthenticator: form.get('resetAuthenticator') === 'on' },
      }),
    'Password reset. They were signed out and emailed a new temporary password.',
    '/admin/admins',
  );
}

export async function deleteAdmin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sub = subSchema.safeParse(form.get('sub'));
  if (!sub.success) return { error: 'Invalid request' };
  return call(
    () => api('admin', `/v1/identity/admin/admins/${sub.data}`, { method: 'DELETE' }),
    'Admin deleted.',
    '/admin/admins',
  );
}

function parseRole(form: FormData) {
  return roleInputSchema.safeParse({
    name: form.get('name'),
    description: form.get('description'),
    permissions: form.getAll('permissions'),
  });
}

export async function saveRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseRole(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const id = form.get('id');
  if (id) {
    const roleId = roleIdSchema.safeParse(id);
    if (!roleId.success) return { error: 'Invalid role' };
    return call(
      () =>
        api('admin', `/v1/identity/admin/roles/${roleId.data}`, {
          method: 'PUT',
          body: parsed.data,
        }),
      'Role saved. Admins with this role get the change within 15 minutes.',
      '/admin/roles',
    );
  }
  return call(
    () => api('admin', '/v1/identity/admin/roles', { method: 'POST', body: parsed.data }),
    `Role "${parsed.data.name}" created.`,
    '/admin/roles',
  );
}

export async function deleteRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const roleId = roleIdSchema.safeParse(form.get('id'));
  if (!roleId.success) return { error: 'Invalid role' };
  return call(
    () => api('admin', `/v1/identity/admin/roles/${roleId.data}`, { method: 'DELETE' }),
    'Role deleted.',
    '/admin/roles',
  );
}
