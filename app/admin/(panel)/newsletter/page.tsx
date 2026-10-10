import type { NewsletterSubscriber } from '@aussie/shared-types';
import { Mail } from 'lucide-react';
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

export const metadata = { title: 'Newsletter' };

const SOURCE: Record<NewsletterSubscriber['source'], string> = {
  footer: 'Shop footer',
  'coming-soon': 'Coming-soon page',
};

export default async function NewsletterPage() {
  await requirePermission('content:write');
  const { items } = await api<{ items: NewsletterSubscriber[] }>(
    'admin',
    '/v1/content/admin/newsletter',
  );

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Newsletter"
        description="Emails collected from the shop footer and the coming-soon page. Sending newsletters from here is coming soon."
        actions={<Badge tone="info">{items.length} subscribed</Badge>}
      />
      {items.length === 0 ? (
        <Panel>
          <EmptyState icon={<Mail size={20} />} title="No subscribers yet">
            Visitors who leave their email in the footer or on the coming-soon page show up here.
          </EmptyState>
        </Panel>
      ) : (
        <Panel flush>
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Signed up from</Th>
                  <Th>When</Th>
                </tr>
              </Thead>
              <Tbody>
                {items.map((s) => (
                  <Tr key={s.email}>
                    <Td>
                      <a href={`mailto:${s.email}`} className="hover:underline">
                        {s.email}
                      </a>
                    </Td>
                    <Td>{SOURCE[s.source]}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(s.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  );
}
