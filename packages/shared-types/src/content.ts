/**
 * Site content the owner can change without a developer (content service): store details, the
 * announcement bar, home page sliders and policy/information pages.
 */

/** The store's name. Fixed: it is the brand, not a setting. */
export const STORE_NAME = 'OZARA';

/** What a first-time visitor sees (they can switch with the theme button). */
export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Information pages with fixed addresses (`/info/<slug>`). */
export const PAGE_SLUGS = ['terms', 'privacy', 'returns', 'delivery', 'about', 'contact'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const PAGE_TITLES: Record<PageSlug, string> = {
  terms: 'Terms and Conditions',
  privacy: 'Privacy Policy',
  returns: 'Returns and Refunds',
  delivery: 'Delivery Information',
  about: 'About Us',
  contact: 'Contact Us',
};

export interface SiteSettings {
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  /** Short note in the footer, e.g. opening hours. */
  footerNote?: string;
  announcement: { enabled: boolean; text: string; href?: string };
  theme: {
    defaultMode: ThemeMode;
  };
  home: { showCategories: boolean; showNewIn: boolean; showTrustBar: boolean };
  updatedAt?: string;
}

export interface Banner {
  id: string;
  /** Path of the image in the media bucket (`site/<id>.<ext>`). */
  imagePath: string;
  alt: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  /** A path on the store (`/shop`) or an https address. */
  href?: string;
  /** Lower numbers first. */
  sortOrder: number;
  active: boolean;
  /** Sri Lanka calendar dates, `YYYY-MM-DD`, both optional. */
  startsOn?: string;
  endsOn?: string;
  updatedAt: string;
}

export interface InfoPage {
  slug: PageSlug;
  title: string;
  /** Plain text with a few simple marks (headings, lists, bold, links); see the admin page editor. */
  body: string;
  published: boolean;
  /** True while the page still shows the built-in placeholder text. */
  isPlaceholder: boolean;
  updatedAt?: string;
}

/** What the storefront gets in one call (cached briefly). */
/** Launch lock: while on, the public shop asks for a password (the admin panel is never locked). */
export interface SiteLockPublic {
  enabled: boolean;
  message?: string;
  /** Changes whenever the password changes, so old unlock cookies stop working. */
  version?: string;
}

export interface SiteLockAdmin {
  enabled: boolean;
  message?: string;
  hasPassword: boolean;
  updatedAt?: string;
}

/** Someone who left their email for news and launch updates (a lead; nothing is sent yet). */
export interface NewsletterSubscriber {
  email: string;
  /** Where they signed up. */
  source: 'footer' | 'coming-soon';
  createdAt: string;
}

/** What a customer is writing to us about (picks the label in the email and the admin inbox). */
export const INQUIRY_TOPICS = ['ORDER', 'PRODUCT', 'WEBSITE_BUG', 'FEATURE', 'OTHER'] as const;
export type InquiryTopic = (typeof INQUIRY_TOPICS)[number];

export const INQUIRY_TOPIC_LABELS: Record<InquiryTopic, string> = {
  ORDER: 'An order',
  PRODUCT: 'A product',
  WEBSITE_BUG: 'A problem with the website',
  FEATURE: 'A suggestion or feature request',
  OTHER: 'Something else',
};

/** Where a Contact page message stands. Staff reply by email themselves and then update this. */
export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'ADDRESSED', 'CLOSED'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  ADDRESSED: 'Addressed',
  CLOSED: 'Closed',
};

/** A message from the Contact page, kept in the database and handled from the admin. */
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic: InquiryTopic;
  orderNumber?: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  /** Internal note for staff (what was done, who was told). Never shown to the customer. */
  note?: string;
  createdAt: string;
  /** Last status or note change. */
  updatedAt?: string;
}

export interface PublicSite {
  settings: SiteSettings;
  /** Banners that are active today, in order. */
  banners: Banner[];
  pages: { slug: PageSlug; title: string }[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  announcement: { enabled: true, text: 'Cash on delivery · Island-wide delivery' },
  theme: {
    defaultMode: 'light',
  },
  home: { showCategories: true, showNewIn: true, showTrustBar: true },
};
