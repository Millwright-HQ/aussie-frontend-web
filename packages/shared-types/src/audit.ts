/** Audit trail shapes shared by every service and the admin UI. */

export const AUDIT_SERVICES = [
  'identity',
  'catalog',
  'inventory',
  'delivery',
  'orders',
  'reviews',
  'content',
  'web',
] as const;
export type AuditService = (typeof AUDIT_SERVICES)[number];

export type AuditActorType = 'admin' | 'customer' | 'guest' | 'system';

/**
 * - `change`: something was created, updated, deleted, or a session event (sign-in, sign-out)
 * - `view`: an admin opened or listed something
 */
export type AuditKind = 'change' | 'view';

export type AuditOutcome = 'success' | 'failed' | 'denied';

export interface AuditRecord {
  id: string;
  /** ISO time. */
  at: string;
  service: string;
  kind: AuditKind;
  actorType: AuditActorType;
  /** Cognito sub (admins, customers); absent for guests and system. */
  actorSub?: string;
  actorName?: string;
  /** Dotted name, e.g. `catalog.products.update` or `session.signout`. */
  action: string;
  method?: string;
  /** Route pattern, e.g. `/v1/catalog/admin/products/:id`. */
  path?: string;
  targetType?: string;
  targetId?: string;
  outcome: AuditOutcome;
  status?: number;
  durationMs?: number;
  /** Address the API saw, and the visitor address reported by the website (if any). */
  ip?: string;
  clientIp?: string;
  userAgent?: string;
  requestId?: string;
  query?: Record<string, string>;
  /** Request body with secrets removed and long text cut short. */
  body?: unknown;
  before?: unknown;
  after?: unknown;
}

/** EventBridge detail-type carrying one AuditRecord. */
export const AUDIT_EVENT = 'audit.Recorded';

export interface AuditFilter {
  actorType?: AuditActorType;
  actorSub?: string;
  service?: string;
  action?: string;
  outcome?: AuditOutcome;
  kind?: AuditKind;
  /** Free text, matched against action, path, target id and name. */
  q?: string;
  /** ISO times (inclusive). */
  from?: string;
  to?: string;
}
