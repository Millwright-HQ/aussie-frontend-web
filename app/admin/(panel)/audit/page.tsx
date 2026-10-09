import { AUDIT_SERVICES, type AuditRecord } from '@aussie/shared-types';
import { ScrollText, Search, X } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { actionLabel, auditTarget, serviceLabel } from '@/lib/audit-format';
import {
  Avatar,
  Badge,
  type BadgeTone,
  Button,
  buttonVariants,
  EmptyState,
  PageHeader,
  Pager,
  Select,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { AuditDetail } from './audit-detail';

export const metadata = { title: 'Audit log' };

const TASKS = [
  { value: '', label: 'Any task' },
  { value: '.create', label: 'Created something' },
  { value: '.update', label: 'Updated something' },
  { value: '.delete', label: 'Deleted something' },
  { value: '.view', label: 'Looked at something' },
  { value: 'admin.login', label: 'Signed in' },
  { value: 'session.signout', label: 'Signed out' },
  { value: 'authenticator', label: 'Authenticator (2-step)' },
  { value: 'status', label: 'Order status changes' },
  { value: 'stock', label: 'Stock changes' },
] as const;

const WHO = [
  { value: '', label: 'Anyone' },
  { value: 'admin', label: 'Admins' },
  { value: 'customer', label: 'Customers' },
  { value: 'guest', label: 'Guests (not signed in)' },
  { value: 'system', label: 'System' },
] as const;

const OUTCOME_TONE: Record<AuditRecord['outcome'], BadgeTone> = {
  success: 'success',
  failed: 'danger',
  denied: 'warning',
};
const OUTCOME_WORD: Record<AuditRecord['outcome'], string> = {
  success: 'Worked',
  failed: 'Failed',
  denied: 'Not allowed',
};

type Search = {
  q?: string;
  actorType?: string;
  actorSub?: string;
  service?: string;
  action?: string;
  outcome?: string;
  kind?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.find((a) => a === value);

/** Sri Lanka calendar days → the instants the API filters on. */
const dayStart = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999+05:30`).toISOString();

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePermission('audit:read');
  const sp = await searchParams;

  const filters = {
    q: sp.q?.trim().slice(0, 100) || undefined,
    actorType: pick(sp.actorType, ['admin', 'customer', 'guest', 'system'] as const),
    actorSub: sp.actorSub?.trim().slice(0, 80) || undefined,
    service: pick(sp.service, AUDIT_SERVICES),
    action: TASKS.find((t) => t.value && t.value === sp.action)?.value,
    outcome: pick(sp.outcome, ['success', 'failed', 'denied'] as const),
    kind: pick(sp.kind, ['change', 'view'] as const),
    from: sp.from && DAY.test(sp.from) ? sp.from : undefined,
    to: sp.to && DAY.test(sp.to) ? sp.to : undefined,
  };
  const qs = new URLSearchParams({ limit: '50' });
  for (const [k, v] of Object.entries(filters)) {
    if (!v || k === 'from' || k === 'to') continue;
    qs.set(k, v);
  }
  if (filters.from) qs.set('from', dayStart(filters.from));
  if (filters.to) qs.set('to', dayEnd(filters.to));
  if (sp.cursor) qs.set('cursor', sp.cursor);

  const [page, admins] = await Promise.all([
    api<{ items: AuditRecord[]; nextCursor: string | null }>(
      'admin',
      `/v1/identity/admin/audit?${qs}`,
    ),
    api<{ items: { sub: string; name: string }[] }>('admin', '/v1/identity/admin/admins').catch(
      () => ({ items: [] }),
    ),
  ]);
  const nameOf = new Map(admins.items.map((a) => [a.sub, a.name]));
  const who = (r: AuditRecord) => {
    if (r.actorType === 'guest') return 'Guest';
    if (r.actorType === 'system') return 'System';
    if (r.actorSub === 'bootstrap-script') return 'Setup script';
    const name = r.actorName ?? (r.actorSub ? nameOf.get(r.actorSub) : undefined);
    if (name) return name;
    return `${r.actorType === 'customer' ? 'Customer' : 'Admin'} ${r.actorSub?.slice(0, 8) ?? ''}`.trim();
  };

  const active = Object.entries(filters).filter(([, v]) => v).length;
  const keep = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...over })) if (v) p.set(k, v);
    return `/admin/audit?${p}`;
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every sign-in, change and view across the whole store: admins, customers and guests. Newest first, times in Sri Lanka time. Open an entry for every detail."
      />

      <form
        method="get"
        role="search"
        aria-label="Filter the audit log"
        className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block lg:col-span-2">
            <span className="sr-only">Search</span>
            <Search
              aria-hidden
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Search tasks, ids, names, addresses…"
              className="h-10 w-full rounded-sm border border-border bg-surface pr-3 pl-9 text-sm shadow-sm"
            />
          </label>
          <div>
            <label htmlFor="f-who" className="mb-1 block text-xs text-muted">
              Who
            </label>
            <Select id="f-who" name="actorType" defaultValue={filters.actorType ?? ''}>
              {WHO.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="f-admin" className="mb-1 block text-xs text-muted">
              Specific person
            </label>
            <Select id="f-admin" name="actorSub" defaultValue={filters.actorSub ?? ''}>
              <option value="">Anyone</option>
              {admins.items.map((a) => (
                <option key={a.sub} value={a.sub}>
                  {a.name}
                </option>
              ))}
              {filters.actorSub && !nameOf.has(filters.actorSub) && (
                <option value={filters.actorSub}>{filters.actorSub.slice(0, 8)}… (customer)</option>
              )}
            </Select>
          </div>
          <div>
            <label htmlFor="f-task" className="mb-1 block text-xs text-muted">
              Task
            </label>
            <Select id="f-task" name="action" defaultValue={filters.action ?? ''}>
              {TASKS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="f-service" className="mb-1 block text-xs text-muted">
              Service
            </label>
            <Select id="f-service" name="service" defaultValue={filters.service ?? ''}>
              <option value="">All services</option>
              {AUDIT_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {serviceLabel(s)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="f-outcome" className="mb-1 block text-xs text-muted">
              Result
            </label>
            <Select id="f-outcome" name="outcome" defaultValue={filters.outcome ?? ''}>
              <option value="">Any result</option>
              <option value="success">Worked</option>
              <option value="failed">Failed</option>
              <option value="denied">Not allowed</option>
            </Select>
          </div>
          <div>
            <label htmlFor="f-kind" className="mb-1 block text-xs text-muted">
              Type
            </label>
            <Select id="f-kind" name="kind" defaultValue={filters.kind ?? ''}>
              <option value="">Changes and views</option>
              <option value="change">Changes only</option>
              <option value="view">Views only</option>
            </Select>
          </div>
          <div>
            <label htmlFor="f-from" className="mb-1 block text-xs text-muted">
              From
            </label>
            <input
              id="f-from"
              type="date"
              name="from"
              defaultValue={filters.from}
              className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="f-to" className="mb-1 block text-xs text-muted">
              To
            </label>
            <input
              id="f-to"
              type="date"
              name="to"
              defaultValue={filters.to}
              className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm shadow-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">Apply filters</Button>
          {active > 0 && (
            <Link href="/admin/audit" className={buttonVariants({ variant: 'ghost' })}>
              <X aria-hidden size={14} /> Clear {active} filter{active === 1 ? '' : 's'}
            </Link>
          )}
        </div>
      </form>

      <TableShell>
        {page.items.length === 0 ? (
          <EmptyState icon={<ScrollText size={20} />} title="Nothing found">
            {active > 0
              ? 'No entries match these filters. Widen the dates or clear a filter.'
              : 'Activity appears here as it happens.'}
          </EmptyState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Task</Th>
                <Th>Detail</Th>
                <Th>Result</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </Thead>
            <Tbody>
              {page.items.map((r) => {
                const name = who(r);
                const label = actionLabel(r.action);
                const when = formatDateTime(r.at);
                return (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap text-muted">{when}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={name} size={28} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {r.actorType === 'customer' && r.actorSub ? (
                              <Link
                                href={`/admin/customers/${r.actorSub}`}
                                className="hover:underline"
                              >
                                {name}
                              </Link>
                            ) : (
                              name
                            )}
                          </p>
                          <p className="text-xs text-muted capitalize">{r.actorType}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium">{label}</p>
                      <Badge className="mt-1">{serviceLabel(r.service)}</Badge>
                      {r.kind === 'view' && <span className="ml-1.5 text-xs text-muted">view</span>}
                    </Td>
                    <Td className="max-w-[22rem] truncate text-muted">
                      <span title={auditTarget(r)}>{auditTarget(r) || '—'}</span>
                    </Td>
                    <Td>
                      <Badge tone={OUTCOME_TONE[r.outcome]}>{OUTCOME_WORD[r.outcome]}</Badge>
                    </Td>
                    <Td className="text-right">
                      <AuditDetail record={r} title={label} who={name} when={when} />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </TableShell>
      <Pager
        prev={sp.cursor ? keep({ cursor: undefined }) : undefined}
        next={page.nextCursor ? keep({ cursor: page.nextCursor }) : undefined}
        note={`${page.items.length} entr${page.items.length === 1 ? 'y' : 'ies'} shown`}
      />
    </div>
  );
}
