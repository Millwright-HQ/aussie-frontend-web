import type { PromotionView } from '@aussie/shared-types';
import Link from 'next/link';
import {
  Badge,
  buttonVariants,
  EmptyState,
  formatLkr,
  PageHeader,
  Table,
  TableShell,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/app/admin/_ui';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { describeDiscount, describeScope, STATUS_LABEL, STATUS_TONE } from '@/lib/promotions';

export const metadata = { title: 'Promotions' };

function period(p: PromotionView): string {
  if (!p.startsAt && !p.endsAt) return 'Always';
  if (p.startsAt && p.endsAt) return `${formatDateTime(p.startsAt)} to ${formatDateTime(p.endsAt)}`;
  return p.endsAt ? `Until ${formatDateTime(p.endsAt)}` : `From ${formatDateTime(p.startsAt)}`;
}

export default async function PromotionsPage() {
  const me = await requirePermission('promotion:read');
  const { items } = await api<{ items: PromotionView[] }>('admin', '/v1/orders/admin/promotions');
  const canEdit = can(me, 'promotion:write');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Discount codes customers type at checkout. The discount comes off the products only (after the store-wide discount); delivery is never discounted, except by a free-delivery code."
        actions={
          canEdit && (
            <Link href="/admin/promotions/new" className={buttonVariants({ size: 'sm' })}>
              New promotion
            </Link>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState title="No promotions yet">
          Create a code to give customers a percentage, a fixed amount or free delivery.
        </EmptyState>
      ) : (
        <TableShell>
          <Table>
            <Thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Applies to</Th>
                <Th>Used</Th>
                <Th>Given so far</Th>
                <Th>When</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {items.map((p) => (
                <Tr key={p.id} className="align-top">
                  <Td>
                    <Link
                      href={`/admin/promotions/${p.id}`}
                      className="font-mono text-[13px] font-semibold text-primary hover:underline"
                    >
                      {p.code}
                    </Link>
                    <p className="text-[13px] text-muted">{p.name}</p>
                  </Td>
                  <Td>{describeDiscount(p)}</Td>
                  <Td>{describeScope(p)}</Td>
                  <Td className="tabular">
                    {p.usedCount} / {p.maxUses ?? 'unlimited'}
                  </Td>
                  <Td className="tabular">{formatLkr(p.totalDiscountCents)}</Td>
                  <Td className="text-[13px]">{period(p)}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableShell>
      )}
    </div>
  );
}
