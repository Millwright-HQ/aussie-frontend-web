import type { WaitlistEntry, WaitlistVariantSummary } from '@aussie/shared-types';
import { BellRing } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime, requirePermission } from '@/lib/admin';
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { ProductTabs } from '../tabs';

export const metadata = { title: 'Waitlist' };

export default async function WaitlistPage() {
  const me = await requirePermission('inventory:read');
  const { summary, entries } = await api<{
    summary: WaitlistVariantSummary[];
    entries: WaitlistEntry[];
  }>('admin', '/v1/inventory/admin/waitlist');
  const waitingTotal = summary.reduce((n, s) => n + s.waiting, 0);

  return (
    <div>
      <PageHeader
        title="Waitlist"
        description="Shoppers who asked to be told when a sold-out item is back. Use the counts to plan your next bulk order; they are emailed automatically once stock is added."
      />
      <ProductTabs me={me} current="/admin/products/waitlist" />

      {summary.length === 0 ? (
        <Panel>
          <EmptyState title="Nobody is waiting yet" icon={<BellRing aria-hidden size={22} />}>
            When a product is sold out, shoppers can leave their email on its page. They show up
            here.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-6">
          <Panel
            flush
            title="What people are waiting for"
            description={`${waitingTotal} ${waitingTotal === 1 ? 'person is' : 'people are'} waiting across ${summary.length} ${summary.length === 1 ? 'item' : 'items'}.`}
          >
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>SKU</Th>
                    <Th>On hand</Th>
                    <Th>Waiting</Th>
                    <Th>Already told</Th>
                    <Th>Latest sign-up</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {summary.map((s) => (
                    <Tr key={s.variantId}>
                      <Td>
                        <Link
                          href={`/admin/products/${s.productId}`}
                          className="font-medium hover:underline"
                        >
                          {s.productName}
                        </Link>
                        {s.label && <span className="block text-xs text-muted">{s.label}</span>}
                      </Td>
                      <Td className="font-mono text-xs">{s.sku}</Td>
                      <Td className="tabular">
                        {s.onHand <= 0 ? <Badge tone="danger">Sold out</Badge> : s.onHand}
                      </Td>
                      <Td className="font-semibold tabular">{s.waiting}</Td>
                      <Td className="tabular text-muted">{s.notified}</Td>
                      <Td className="whitespace-nowrap text-muted">{formatDateTime(s.latestAt)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </Panel>

          <Panel flush title="Sign-ups">
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Product</Th>
                    <Th>Email</Th>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {entries.map((e) => (
                    <Tr key={`${e.variantId}-${e.email}`}>
                      <Td className="whitespace-nowrap text-muted">
                        {formatDateTime(e.createdAt)}
                      </Td>
                      <Td>
                        {e.productName}
                        {e.label && <span className="block text-xs text-muted">{e.label}</span>}
                      </Td>
                      <Td>
                        <a href={`mailto:${e.email}`} className="hover:underline">
                          {e.email}
                        </a>
                      </Td>
                      <Td>{e.name ?? ''}</Td>
                      <Td className="whitespace-nowrap">{e.phone ?? ''}</Td>
                      <Td>
                        {e.status === 'WAITING' ? (
                          <Badge tone="warning">Waiting</Badge>
                        ) : (
                          <Badge tone="success">Told it is back</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
