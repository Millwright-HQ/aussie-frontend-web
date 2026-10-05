import { REVIEW_STATUSES, type ReviewStatus } from '@aussie/shared-types';
import { MessageSquareText } from 'lucide-react';
import { ActionForm } from '../action-form';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import type { OwnReview } from '@/lib/reviews';
import { Stars } from '../../../(store)/_components/stars';
import { moderateReviewAction } from './actions';
import {
  Badge,
  type BadgeTone,
  EmptyState,
  Input,
  PageHeader,
  Pager,
  Panel,
  Pills,
} from '@/app/admin/_ui';

export const metadata = { title: 'Reviews' };

type Row = OwnReview & { orderId: string; moderatedAt?: string };

const LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const TONES: Record<ReviewStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};
const label = (s: ReviewStatus) => Object.entries(LABELS).find(([k]) => k === s)?.[1] ?? s;
const tone = (s: ReviewStatus): BadgeTone =>
  Object.entries(TONES).find(([k]) => k === s)?.[1] ?? 'neutral';

export default async function ReviewsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const me = await requirePermission('review:read');
  const sp = await searchParams;
  const status = REVIEW_STATUSES.find((s) => s === sp.status) ?? 'PENDING';
  const qs = new URLSearchParams({
    status,
    limit: '20',
    ...(sp.cursor ? { cursor: sp.cursor } : {}),
  });
  const [page, counts] = await Promise.all([
    api<{ items: Row[]; nextCursor: string | null }>('admin', `/v1/reviews/admin/queue?${qs}`),
    api<Record<ReviewStatus, number>>('admin', '/v1/reviews/admin/counts').catch(() => null),
  ]);
  const canModerate = can(me, 'review:moderate');

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Customers can only review products they received. Approve a review to show it on the store."
      />
      <div className="mb-4">
        <Pills
          current={status}
          items={REVIEW_STATUSES.map((s) => ({
            key: s,
            label: label(s),
            count: counts ? Object.entries(counts).find(([k]) => k === s)?.[1] : undefined,
            href: `/admin/reviews?status=${s}`,
          }))}
        />
      </div>

      {page.items.length === 0 ? (
        <Panel>
          <EmptyState icon={<MessageSquareText size={20} />} title="Nothing here">
            {status === 'PENDING'
              ? 'No reviews are waiting for you.'
              : 'No reviews in this group yet.'}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="space-y-4">
          {page.items.map((r) => (
            <li key={r.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.productName}</p>
                    <Stars value={r.rating} />
                  </div>
                  <div className="text-right">
                    <Badge tone={tone(r.status)}>{label(r.status)}</Badge>
                    <p className="mt-1 text-xs text-muted">{formatDateTime(r.createdAt)}</p>
                  </div>
                </div>
                {r.title && <p className="mt-3 text-sm font-medium">{r.title}</p>}
                {/* Plain text only (never HTML). */}
                <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p>
                {r.status === 'REJECTED' && r.rejectionReason && (
                  <p className="mt-2 text-xs text-muted">Reason: {r.rejectionReason}</p>
                )}
                {canModerate && (
                  <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                    {r.status !== 'APPROVED' && (
                      <ActionForm
                        action={moderateReviewAction.bind(null, r.productId, r.id, 'approve')}
                        submitLabel="Approve"
                        size="sm"
                      />
                    )}
                    {r.status !== 'REJECTED' && (
                      <ActionForm
                        action={moderateReviewAction.bind(null, r.productId, r.id, 'reject')}
                        submitLabel={r.status === 'APPROVED' ? 'Take down' : 'Reject'}
                        variant="outline"
                        size="sm"
                        inline
                      >
                        <label className="sr-only" htmlFor={`reason-${r.id}`}>
                          Reason (shown to the customer)
                        </label>
                        <Input
                          id={`reason-${r.id}`}
                          name="reason"
                          maxLength={300}
                          placeholder="Reason (shown to the customer)"
                          className="w-72"
                        />
                      </ActionForm>
                    )}
                  </div>
                )}
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <Pager
        prev={sp.cursor ? `/admin/reviews?status=${status}` : undefined}
        next={
          page.nextCursor
            ? `/admin/reviews?status=${status}&cursor=${encodeURIComponent(page.nextCursor)}`
            : undefined
        }
      />
    </div>
  );
}
