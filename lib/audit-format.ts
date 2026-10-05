import type { AuditRecord } from '@aussie/shared-types';

/** Plain-words names for the actions people care about most. Anything else is described from its route. */
const KNOWN: Record<string, string> = {
  'admin.login': 'Signed in',
  'session.signout': 'Signed out',
  'admin.create': 'Invited an admin',
  'admin.delete': 'Deleted an admin',
  'admin.disable': 'Disabled an admin',
  'admin.enable': 'Enabled an admin',
  'admin.role.assign': 'Changed an admin’s role',
  'admin.password.reset': 'Reset an admin’s password',
  'admin.profile.update': 'Updated their profile',
  'admin.authenticator.enable': 'Turned on the authenticator app',
  'admin.authenticator.disable': 'Turned off the authenticator app',
  'admin.authenticator.verified': 'Entered an authenticator code',
  'admin.authenticator.failed': 'Wrong authenticator code',
  'role.create': 'Created a role',
  'role.update': 'Updated a role',
  'role.delete': 'Deleted a role',
};

const VERBS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  view: 'Viewed',
};

const lookup = (table: Record<string, string>, key: string) =>
  Object.entries(table).find(([k]) => k === key)?.[1];

/** "catalog.products.update" → "Updated products" */
export function actionLabel(action: string): string {
  const known = lookup(KNOWN, action);
  if (known) return known;
  const parts = action.split('.');
  const verb = lookup(VERBS, parts.at(-1) ?? '');
  const middle = parts.slice(1, verb ? -1 : undefined).filter((p) => p !== 'root');
  const what = middle.join(' › ').replace(/-/g, ' ') || parts[0] || action;
  return verb ? `${verb} ${what}` : action;
}

export const SERVICE_LABELS: Record<string, string> = {
  identity: 'Accounts',
  catalog: 'Catalog',
  inventory: 'Inventory',
  delivery: 'Delivery',
  orders: 'Orders',
  reviews: 'Reviews',
  content: 'Site content',
  web: 'Website',
};

export const serviceLabel = (service: string) => lookup(SERVICE_LABELS, service) ?? service;

/** What the entry was about, in a few words. */
export function auditTarget(r: AuditRecord): string {
  const after = (r.after ?? {}) as Record<string, unknown>;
  if (r.action === 'admin.login') {
    return `${String(after.ip ?? r.clientIp ?? '')}${after.newDevice ? ' · new device' : ''}`.trim();
  }
  if (typeof after.email === 'string') return after.email;
  if (typeof after.roleId === 'string') return `role: ${after.roleId}`;
  if (typeof after.name === 'string') return after.name;
  if (r.path) return `${r.method ?? ''} ${r.path}${r.targetId ? ` · ${r.targetId}` : ''}`.trim();
  return r.targetId ?? '';
}
