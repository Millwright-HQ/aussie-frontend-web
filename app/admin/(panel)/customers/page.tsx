import { Users } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import {
  Avatar,
  Badge,
  EmptyState,
  formatLkPhone,
  PageHeader,
  Pager,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';

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
    <div>
      <PageHeader
        title="Customers"
        description="Newest first. Open a customer to see their orders."
      />
      <TableShell>
        {page.items.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="No customers yet">
            Customers who create an account appear here.
          </EmptyState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Customer</Th>
                <Th>Mobile</Th>
                <Th>Offers</Th>
                <Th>Joined</Th>
              </tr>
            </Thead>
            <Tbody>
              {page.items.map((c) => (
                <Tr key={c.sub}>
                  <Td>
                    <Link href={`/admin/customers/${c.sub}`} className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">{c.name}</span>
                        <span className="block truncate text-[13px] text-muted">{c.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="tabular">{c.phone ? formatLkPhone(c.phone) : '—'}</Td>
                  <Td>
                    <Badge tone={c.marketingOptIn ? 'success' : 'neutral'}>
                      {c.marketingOptIn ? 'Subscribed' : 'Not subscribed'}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(c.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </TableShell>
      <Pager
        prev={cursor ? '/admin/customers' : undefined}
        next={
          page.nextCursor
            ? `/admin/customers?cursor=${encodeURIComponent(page.nextCursor)}`
            : undefined
        }
      />
    </div>
  );
}
