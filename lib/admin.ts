import 'server-only';
import type { Permission } from '@aussie/shared-types';
import { redirect } from 'next/navigation';
import { api, ApiError } from './api';
import { requireAdminSession } from './auth/session';

export interface AdminMe {
  sub: string;
  email: string;
  name: string;
  roleId: string;
  status: 'ACTIVE' | 'DISABLED';
  permissions: Permission[];
}

export interface AdminRow {
  sub: string;
  email: string;
  name: string;
  roleId: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLoginAt?: string;
}

export interface RoleRow {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
}

/** The signed-in admin. Redirects to sign-in when the session or account is no longer valid. */
export async function currentAdmin(): Promise<AdminMe> {
  await requireAdminSession();
  try {
    return await api<AdminMe>('admin', '/v1/identity/admin/me');
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 401 || err.status === 403 || err.status === 404)
    ) {
      redirect('/admin/login');
    }
    throw err;
  }
}

export const can = (me: AdminMe, p: Permission) => me.permissions.includes(p);

/** Page guard: shows the "no access" state instead of calling an API that would refuse. */
export async function requirePermission(p: Permission): Promise<AdminMe> {
  const me = await currentAdmin();
  if (!can(me, p)) redirect('/admin?denied=1');
  return me;
}

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: 'Products', permissions: ['product:read', 'product:write', 'category:write'] },
  { label: 'Inventory', permissions: ['inventory:read', 'inventory:adjust'] },
  {
    label: 'Orders',
    permissions: ['order:read', 'order:update-status', 'order:cod', 'order:payment'],
  },
  { label: 'Delivery', permissions: ['delivery:read', 'delivery:write'] },
  { label: 'Reviews', permissions: ['review:read', 'review:moderate'] },
  { label: 'Customers', permissions: ['customer:read'] },
  {
    label: 'Administration',
    permissions: ['admin:manage', 'role:manage', 'settings:write', 'content:write', 'audit:read'],
  },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  'product:read': 'View products',
  'product:write': 'Create & edit products',
  'category:write': 'Manage categories',
  'inventory:read': 'View stock',
  'inventory:adjust': 'Adjust stock',
  'order:read': 'View orders',
  'order:update-status': 'Update order status',
  'order:cod': 'Record COD collected',
  'order:payment': 'Confirm bank transfer payments',
  'delivery:read': 'View delivery rates',
  'delivery:write': 'Edit delivery rates',
  'review:read': 'View reviews',
  'review:moderate': 'Moderate reviews',
  'customer:read': 'View customers',
  'admin:manage': 'Manage admins',
  'role:manage': 'Manage roles',
  'settings:write': 'Edit store settings',
  'content:write': 'Edit site content (banners, pages, theme)',
  'audit:read': 'View audit log',
};

const LABELS = new Map(Object.entries(PERMISSION_LABELS));
export const permissionLabel = (p: Permission) => LABELS.get(p) ?? p;

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
