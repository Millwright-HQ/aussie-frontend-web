import { REVIEW_STATUSES, type ReviewStatus } from '@aussie/shared-types';
import { Card, Input } from '@aussie/ui';
import Link from 'next/link';
import { ActionForm } from '../action-form';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import type { OwnReview } from '@/lib/reviews';
import { Stars } from '../../../(store)/_components/stars';
import { moderateReviewAction } from './actions';

export const metadata = { title: 'Reviews' };

type Row = OwnReview & { orderId: string; moderatedAt?: string };

const LABELS = new Map<string, string>(
  Object.entries({ PENDING: 'Waiting', APPROVED: 'Approved', REJECTED: 'Rejected' }),
);
const label = (s: ReviewStatus) => LABELS.get(s) ?? s;

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
  const page = await api<{ items: Row[]; nextCursor: string | null }>(
    'admin',
    `/v1/reviews/admin/queue?${qs}`,
  );
  const canModerate = can(me, 'review:moderate');

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Reviews</h1>
      <nav aria-label="Review status" className="flex flex-wrap gap-2">
        {REVIEW_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reviews?status=${s}`}
            aria-current={s === status ? 'page' : undefined}
            className="min-h-9 rounded-full border border-border px-3 py-1.5 text-sm aria-[current=page]:border-text aria-[current=page]:bg-text aria-[current=page]:text-bg"
          >
            {label(s)}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nothing here.</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {page.items.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.productName}</p>
                    <Stars value={r.rating} />
                  </div>
                  <p className="text-xs text-muted">
                    {formatDateTime(r.createdAt)} · {label(r.status)}
                  </p>
                </div>
                {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                {/* Plain text only (never HTML). */}
                <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p>
                {r.status === 'REJECTED' && r.rejectionReason && (
                  <p className="mt-2 text-xs text-muted">Reason: {r.rejectionReason}</p>
                )}
                {canModerate && (
                  <div className="mt-4 flex flex-wrap items-end gap-3">
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
                          className="w-64"
                        />
                      </ActionForm>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor && (
        <Link
          href={`/admin/reviews?status=${status}&cursor=${encodeURIComponent(page.nextCursor)}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          More →
        </Link>
      )}
    </div>
  );
}
