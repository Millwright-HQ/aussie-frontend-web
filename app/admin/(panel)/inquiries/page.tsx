import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUSES,
  INQUIRY_TOPIC_LABELS,
  type Inquiry,
  type InquiryStatus,
} from '@aussie/shared-types';
import { Inbox, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { Badge, type BadgeTone, EmptyState, PageHeader, Panel, SectionTabs } from '@/app/admin/_ui';
import { InquiryUpdate } from './inquiry-update';

export const metadata = { title: 'Inquiries' };

const TONE = new Map<InquiryStatus, BadgeTone>([
  ['NEW', 'danger'],
  ['IN_PROGRESS', 'warning'],
  ['ADDRESSED', 'success'],
  ['CLOSED', 'neutral'],
]);
const STATUS_LABEL = new Map(Object.entries(INQUIRY_STATUS_LABELS));
const TOPIC_LABEL = new Map(Object.entries(INQUIRY_TOPIC_LABELS));

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const me = await requirePermission('customer:read');
  const { status } = await searchParams;
  const wanted = INQUIRY_STATUSES.find((s) => s === status);
  const { items: all } = await api<{ items: Inquiry[] }>('admin', '/v1/content/admin/inquiries');
  const count = (s: InquiryStatus) => all.filter((q) => q.status === s).length;
  const items = wanted ? all.filter((q) => q.status === wanted) : all;
  const canUpdate = can(me, 'order:update-status');

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Inquiries"
        description="Messages from the Contact page, newest first. Reply to the customer by email, then set the status so the team knows what is done."
      />
      <SectionTabs
        current={wanted ? `/admin/inquiries?status=${wanted}` : '/admin/inquiries'}
        items={[
          { href: '/admin/inquiries', label: 'All', count: all.length },
          ...INQUIRY_STATUSES.map((s) => ({
            href: `/admin/inquiries?status=${s}`,
            label: STATUS_LABEL.get(s) ?? s,
            count: count(s),
          })),
        ]}
      />
      {items.length === 0 ? (
        <Panel>
          <EmptyState icon={<Inbox size={20} />} title="Nothing here">
            {wanted
              ? 'No messages with this status.'
              : 'Messages sent from the Contact page show up here.'}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id}>
              <Panel>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONE.get(q.status) ?? 'neutral'}>{STATUS_LABEL.get(q.status)}</Badge>
                  <Badge tone="neutral">{TOPIC_LABEL.get(q.topic)}</Badge>
                  {q.orderNumber && <Badge tone="info">{q.orderNumber}</Badge>}
                  <span className="ml-auto text-xs text-muted">{formatDateTime(q.createdAt)}</span>
                </div>
                <h2 className="mt-2 text-[15px] font-semibold">{q.subject}</h2>
                <p className="mt-1 text-sm text-muted">
                  {q.name} ·{' '}
                  <a href={`mailto:${q.email}`} className="hover:underline">
                    {q.email}
                  </a>
                  {q.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${q.phone}`} className="hover:underline">
                        {q.phone}
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-3 text-sm whitespace-pre-wrap">{q.message}</p>
                <p className="mt-3">
                  <a
                    href={`mailto:${q.email}?subject=${encodeURIComponent(`Re: ${q.subject}`)}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail aria-hidden size={14} /> Reply by email
                  </a>
                </p>
                {q.note && (
                  <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm">
                    <span className="font-medium">Note:</span> {q.note}
                  </p>
                )}
                {q.updatedAt && (
                  <p className="mt-2 text-xs text-muted">Updated {formatDateTime(q.updatedAt)}</p>
                )}
                {canUpdate && <InquiryUpdate inquiry={q} />}
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
