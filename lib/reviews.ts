import 'server-only';
import type { PublicReview, RatingSummary, ReviewStatus } from '@aussie/shared-types';
import { API_URL, api } from './api';
import { getSession } from './auth/session';

export interface ProductReviews {
  summary: RatingSummary;
  items: PublicReview[];
  nextCursor: string | null;
}

/** Approved reviews and the rating totals of a product. Never throws: a product page works without them. */
export async function getProductReviews(
  productId: string,
  cursor?: string,
): Promise<ProductReviews | null> {
  if (!API_URL) return null;
  const qs = new URLSearchParams({ productId, limit: '10', ...(cursor ? { cursor } : {}) });
  try {
    const res = await fetch(`${API_URL}/v1/reviews?${qs}`, {
      next: { revalidate: 30, tags: [`reviews-${productId}`] },
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok ? ((await res.json()) as ProductReviews) : null;
  } catch {
    return null;
  }
}

export interface OwnReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  title?: string;
  body: string;
  status: ReviewStatus;
  rejectionReason?: string;
  createdAt: string;
}

/** What the signed-in shopper may do on one product page. */
export type ReviewState =
  | { kind: 'signed-out' }
  | { kind: 'can-review' }
  | { kind: 'own'; review: OwnReview }
  | { kind: 'not-yet' };

export async function getReviewState(productId: string): Promise<ReviewState> {
  const session = await getSession('customer');
  if (!session) return { kind: 'signed-out' };
  try {
    const [reviewable, mine] = await Promise.all([
      api<{ items: { productId: string }[] }>('customer', '/v1/reviews/my/reviewable'),
      api<{ items: OwnReview[] }>('customer', '/v1/reviews/my'),
    ]);
    const own = mine.items.find((r) => r.productId === productId);
    if (own) return { kind: 'own', review: own };
    return reviewable.items.some((r) => r.productId === productId)
      ? { kind: 'can-review' }
      : { kind: 'not-yet' };
  } catch {
    return { kind: 'not-yet' };
  }
}
