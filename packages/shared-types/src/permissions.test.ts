import { describe, expect, it } from 'vitest';
import { PERMISSIONS, SYSTEM_ROLES, isPermission } from './permissions.js';

describe('permissions', () => {
  it('super admin has every permission', () => {
    const superAdmin = SYSTEM_ROLES.find((r) => r.id === 'super-admin');
    expect(superAdmin?.permissions).toEqual(PERMISSIONS);
  });

  it('system roles only reference known permissions', () => {
    for (const role of SYSTEM_ROLES) {
      for (const p of role.permissions) expect(isPermission(p)).toBe(true);
    }
  });

  it('rejects unknown permissions', () => {
    expect(isPermission('order:delete-everything')).toBe(false);
  });
});
