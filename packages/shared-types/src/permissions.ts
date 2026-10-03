/** Fine-grained admin permissions. See docs/MASTER_PLAN.md §5.1. */
export const PERMISSIONS = [
  'product:read',
  'product:write',
  'category:write',
  'inventory:read',
  'inventory:adjust',
  'order:read',
  'order:update-status',
  'order:cod',
  'order:payment',
  'delivery:read',
  'delivery:write',
  'review:read',
  'review:moderate',
  'customer:read',
  'admin:manage',
  'role:manage',
  'settings:write',
  'content:write',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export interface SystemRole {
  id: string;
  name: string;
  permissions: readonly Permission[];
}

/** Built-in roles; cannot be deleted. Custom roles are stored in the `roles` table. */
export const SYSTEM_ROLES: readonly SystemRole[] = [
  { id: 'super-admin', name: 'Super Admin', permissions: PERMISSIONS },
  {
    id: 'catalog-manager',
    name: 'Catalog Manager',
    permissions: [
      'product:read',
      'product:write',
      'category:write',
      'content:write',
      'review:read',
      'review:moderate',
      'inventory:read',
    ],
  },
  {
    id: 'inventory-manager',
    name: 'Inventory Manager',
    permissions: ['inventory:read', 'inventory:adjust', 'product:read'],
  },
  {
    id: 'order-staff',
    name: 'Order/Fulfilment Staff',
    permissions: [
      'order:read',
      'order:update-status',
      'order:cod',
      'order:payment',
      'customer:read',
      'delivery:read',
      'inventory:read',
    ],
  },
];
