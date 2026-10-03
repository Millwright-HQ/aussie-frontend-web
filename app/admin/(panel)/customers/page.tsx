import { formatLkPhone } from '@aussie/ui';
import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';

export const metadata = { title: 'Customers' };

interface CustomerRow {
  sub: string;
  email: string;
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await requirePermission('customer:read');
  const { cursor } = await searchParams;
  const qs = new URLSearchParams({ limit: '25', ...(cursor ? { cursor } : {}) });
  const page = await api<{ items: CustomerRow[]; nextCursor: string | null }>(
    'admin',
    `/v1/identity/admin/customers?${qs}`,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Customers</h1>
        <p className="mt-1 text-muted">Newest first. Open a customer to see their orders.</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Offers</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No customers yet.
                </td>
              </tr>
            )}
            {page.items.map((c) => (
              <tr key={c.sub}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/customers/${c.sub}`} className="text-primary hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3 tabular">{c.phone ? formatLkPhone(c.phone) : '—'}</td>
                <td className="px-4 py-3">{c.marketingOptIn ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-sm">
        {cursor && <Link href="/admin/customers">← First page</Link>}
        {page.nextCursor && (
          <Link href={`/admin/customers?cursor=${encodeURIComponent(page.nextCursor)}`}>
            Next page →
          </Link>
        )}
      </div>
    </div>
  );
}
