import type { ReviewableProduct } from '@aussie/shared-types';
import { Card } from '@aussie/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { requireCustomerSession } from '@/lib/auth/session';
import type { OwnReview } from '@/lib/reviews';
import { Stars } from '../../_components/stars';
import { AccountLayout } from '../account-nav';

export const metadata = { title: 'My reviews' };

const STATUS_TEXT = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Published',
  REJECTED: 'Not published',
} as const;

export default async function MyReviewsPage() {
  await requireCustomerSession('/account/reviews');
  const [reviewable, mine] = await Promise.all([
    api<{ items: ReviewableProduct[] }>('customer', '/v1/reviews/my/reviewable'),
    api<{ items: OwnReview[] }>('customer', '/v1/reviews/my'),
  ]);

  return (
    <AccountLayout current="/account/reviews">
      <div className="space-y-6">
        <Card>
          <h2 className="text-h2">Ready to review</h2>
          {reviewable.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Products you have received will show up here, so you can tell others what you think.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {reviewable.items.map((p) => (
                <li
                  key={p.productId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">{p.productName}</p>
                    <p className="text-sm text-muted">Order {p.orderNumber}</p>
                  </div>
                  <Link
                    href={`/p/${p.slug}#reviews`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Write a review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-h2">Your reviews</h2>
          {mine.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">You have not written any reviews yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {mine.items.map((r) => (
                <li key={r.id} className="py-4">
                  <p className="font-medium">{r.productName}</p>
                  <Stars value={r.rating} />
                  {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
                  <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {STATUS_TEXT[r.status]}
                    {r.status === 'REJECTED' && r.rejectionReason ? `: ${r.rejectionReason}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AccountLayout>
  );
}
