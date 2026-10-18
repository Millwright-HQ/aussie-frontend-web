/**
 * Site analytics: first-party, no cookies, no IP addresses stored. A visitor is an anonymous
 * hash that changes every day, so nobody can be followed from one day to the next.
 */

/** What the shop reports: a page view, a product page view, an add to bag, a checkout start. */
export const TRACK_TYPES = ['view', 'product', 'cart', 'checkout'] as const;
export type TrackType = (typeof TRACK_TYPES)[number];

export const DEVICES = ['mobile', 'tablet', 'desktop', 'other'] as const;
export const BROWSERS = [
  'chrome',
  'safari',
  'firefox',
  'edge',
  'samsung',
  'opera',
  'other',
] as const;
export const SYSTEMS = ['android', 'ios', 'windows', 'macos', 'linux', 'other'] as const;

export interface Counted {
  key: string;
  count: number;
}

export interface AnalyticsReport {
  /** 7, 30 or 90. */
  days: number;
  /** First and last day of the window (Sri Lanka time), YYYY-MM-DD. */
  from: string;
  to: string;
  /** One entry per day, oldest first, including quiet days. */
  daily: { date: string; views: number; visitors: number }[];
  totals: {
    views: number;
    /** Each day's unique visitors added up: someone who comes on two days counts twice. */
    visitors: number;
    productViews: number;
    cartAdds: number;
    checkouts: number;
  };
  pages: Counted[];
  referrers: Counted[];
  campaigns: Counted[];
  devices: Counted[];
  browsers: Counted[];
  systems: Counted[];
  countries: Counted[];
  /** Page views by hour of the day (Sri Lanka time), 24 entries. */
  hours: number[];
  /** Most viewed products first. */
  products: { productId: string; views: number; cartAdds: number }[];
}
