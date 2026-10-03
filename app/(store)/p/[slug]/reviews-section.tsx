import type { RatingSummary } from '@aussie/shared-types';
import Link from 'next/link';
import { Stars } from '../../_components/stars';
import { getProductReviews, getReviewState } from '@/lib/reviews';
import { ReviewForm } from './review-form';

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium' });

function Distribution({ summary }: { summary: RatingSummary }) {
  return (
    <ul className="space-y-1 text-sm" aria-label="Reviews by star rating">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = summary.distribution[star - 1] ?? 0;
        return (
          <li key={star} className="flex items-center gap-2">
            <span className="w-12 tabular">{star} star</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full bg-accent"
                style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }}
              />
            </span>
            <span className="w-8 text-right text-muted tabular">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Approved reviews, the totals, and (for a shopper who received the product) the form to write one. */
export async function ReviewsSection({ productId, slug }: { productId: string; slug: string }) {
  const [reviews, state] = await Promise.all([
    getProductReviews(productId),
    getReviewState(productId),
  ]);
  const summary = reviews?.summary;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="mt-12 max-w-3xl">
      <h2 id="reviews-title" className="text-h2">
        Customer reviews
      </h2>

      {summary && summary.count > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div>
            <p className="text-4xl font-semibold tabular">{summary.average.toFixed(1)}</p>
            <Stars value={summary.average} count={summary.count} />
          </div>
          <Distribution summary={summary} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No reviews yet.</p>
      )}

      {reviews && reviews.items.length > 0 && (
        <ul className="mt-6 divide-y divide-border">
          {reviews.items.map((r) => (
            <li key={r.id} className="py-4">
              <Stars value={r.rating} />
              {r.title && <h3 className="mt-1 font-sans text-base font-medium">{r.title}</h3>}
              {/* Plain text only (never HTML): reviews are written by shoppers. */}
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{r.body}</p>
              <p className="mt-2 text-xs text-muted">
                {r.authorName} · {dateOf(r.createdAt)} · Verified purchase
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-md border border-border p-5">
        <h3 className="font-sans text-base font-medium">Write a review</h3>
        <div className="mt-3">
          {state.kind === 'can-review' && <ReviewForm productId={productId} slug={slug} />}
          {state.kind === 'own' && (
            <p className="text-sm text-muted">
              {state.review.status === 'PENDING' &&
                'You have reviewed this product. It will appear once we have approved it.'}
              {state.review.status === 'APPROVED' && 'Thank you, your review is published.'}
              {state.review.status === 'REJECTED' &&
                'Your review was not published' +
                  (state.review.rejectionReason ? `: ${state.review.rejectionReason}` : '.')}
            </p>
          )}
          {state.kind === 'signed-out' && (
            <p className="text-sm text-muted">
              <Link
                href={`/account/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`}
                className="underline"
              >
                Sign in
              </Link>{' '}
              to review a product you have received.
            </p>
          )}
          {state.kind === 'not-yet' && (
            <p className="text-sm text-muted">
              You can review this product after your order has been delivered. Orders placed as a
              guest cannot be reviewed.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
