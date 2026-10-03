/** Review shapes and events (docs/MASTER_PLAN.md §3-4). */

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title?: string;
  /** Plain text only (never rendered as HTML). */
  body: string;
  /** "Nimali P.": first name and last initial, taken from the delivered order. */
  authorName: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt?: string;
  rejectionReason?: string;
}

/** What shoppers see: approved reviews only, without the author's account or order. */
export type PublicReview = Pick<
  Review,
  'id' | 'productId' | 'rating' | 'title' | 'body' | 'authorName' | 'createdAt'
>;

export interface RatingSummary {
  count: number;
  /** Mean rating rounded to one decimal; 0 when there are no reviews. */
  average: number;
  /** Count of reviews by star, index 0 = 1 star … index 4 = 5 stars. */
  distribution: [number, number, number, number, number];
}

/** A delivered product the customer may review. */
export interface ReviewableProduct {
  productId: string;
  productName: string;
  /** Storefront URL name, for the "write a review" link. */
  slug: string;
  orderNumber: string;
  deliveredAt: string;
}

export interface RatingChangedDetail {
  productId: string;
  average: number;
  count: number;
}
