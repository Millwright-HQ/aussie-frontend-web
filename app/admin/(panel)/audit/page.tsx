import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';

export const metadata = { title: 'Audit log' };

interface AuditRow {
  id: string;
  at: string;
  actorSub: string;
  action: string;
  targetType: string;
  targetId: string;
  after?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  'admin.login': 'Signed in',
  'admin.create': 'Created admin',
  'admin.role.assign': 'Changed role',
  'admin.disable': 'Disabled admin',
  'admin.enable': 'Enabled admin',
  'role.create': 'Created role',
  'role.update': 'Updated role',
  'role.delete': 'Deleted role',
};

function detail(row: AuditRow, nameOf: (sub: string) => string | undefined): string {
  const a = row.after ?? {};
  const target = row.targetType === 'admin' ? nameOf(row.targetId) : undefined;
  if (row.action === 'admin.login') {
    return `${String(a.ip ?? '')}${a.newDevice ? ' · new device' : ''}`;
  }
  if (typeof a.email === 'string') return a.email;
  if (typeof a.roleId === 'string') return `${target ?? ''} → ${a.roleId}`.trim();
  if (target) return target;
  if (typeof a.name === 'string') return a.name;
  return row.targetId;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await requirePermission('audit:read');
  const { cursor } = await searchParams;
  const qs = new URLSearchParams({ limit: '50', ...(cursor ? { cursor } : {}) });
  const page = await api<{ items: AuditRow[]; nextCursor: string | null }>(
    'admin',
    `/v1/identity/admin/audit?${qs}`,
  );
  const admins = await api<{ items: { sub: string; name: string }[] }>(
    'admin',
    '/v1/identity/admin/admins',
  ).catch(() => ({ items: [] }));
  const nameOf = (sub: string) => admins.items.find((x) => x.sub === sub)?.name;
  const who = (sub: string) =>
    admins.items.find((x) => x.sub === sub)?.name ??
    (sub === 'bootstrap-script' ? 'Setup script' : sub.slice(0, 8));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Audit log</h1>
        <p className="mt-1 text-muted">
          Every admin sign-in and change, newest first. Times in Sri Lanka time.
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">What</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(r.at)}</td>
                <td className="px-4 py-3">{who(r.actorSub)}</td>
                <td className="px-4 py-3">{ACTION_LABELS[r.action] ?? r.action}</td>
                <td className="px-4 py-3 text-muted">{detail(r, nameOf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-sm">
        {cursor && <Link href="/admin/audit">← Newest</Link>}
        {page.nextCursor && (
          <Link href={`/admin/audit?cursor=${encodeURIComponent(page.nextCursor)}`}>Older →</Link>
        )}
      </div>
    </div>
  );
}
