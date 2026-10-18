/** Promotion codes (owner-created discount codes applied at checkout). Money in cents. */

export const PROMOTION_KINDS = ['PERCENT', 'FIXED', 'FREE_DELIVERY'] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

/** What the discount is taken from: the whole product subtotal, chosen products, or chosen categories. */
export const PROMOTION_SCOPES = ['ORDER', 'PRODUCTS', 'CATEGORIES'] as const;
export type PromotionScope = (typeof PROMOTION_SCOPES)[number];

export interface Promotion {
  id: string;
  /** Upper case, unique, fixed after creation. */
  code: string;
  /** Internal name for the owner ("Eid weekend"). */
  name: string;
  kind: PromotionKind;
  /** PERCENT: whole percent. FIXED: cents off. FREE_DELIVERY: 0. */
  value: number;
  scope: PromotionScope;
  /** Product ids (PRODUCTS) or category ids (CATEGORIES); empty for ORDER. */
  targetIds: string[];
  /** Absent = unlimited. */
  maxUses?: number;
  /** Orders that used it (cancelled orders give their use back). */
  usedCount: number;
  /** Product discount given across those orders, in cents (delivery discounts not included). */
  totalDiscountCents: number;
  startsAt?: string;
  /** Absent = no end. */
  endsAt?: string;
  /** Product subtotal (after the store-wide discount) needed to use the code. */
  minSubtotalCents?: number;
  /** Most a single order can get off its products. */
  maxDiscountCents?: number;
  /** Owner switch; a paused code cannot be used. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromotionStatus = 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'EXPIRED' | 'USED_UP';

export interface PromotionView extends Promotion {
  status: PromotionStatus;
}

/** What an order records about the code it used. */
export interface AppliedPromotion {
  code: string;
  name: string;
  kind: PromotionKind;
  /** Taken off the product subtotal. */
  discountCents: number;
  /** Taken off the delivery fee (free-delivery codes only). */
  deliveryDiscountCents: number;
}

/** Answer to "what would this code do to my bag?" */
export type PromoPreview =
  { valid: true; promo: AppliedPromotion } | { valid: false; message: string };
