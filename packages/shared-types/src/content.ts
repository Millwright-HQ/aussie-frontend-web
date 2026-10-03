/**
 * Site content the owner can change without a developer (content service): store details, the
 * announcement bar, festival themes, home page sliders and policy/information pages.
 */

/** Festival looks. Each key has a colour set in packages/ui/src/tokens.css (`[data-festival]`). */
export const FESTIVALS = [
  {
    key: 'avurudu',
    label: 'Avurudu (Sinhala & Tamil New Year)',
    hint: 'Warm gold and red, mid April',
  },
  { key: 'vesak', label: 'Vesak', hint: 'Soft yellow and lantern blue, May' },
  { key: 'independence', label: 'Independence Day', hint: 'Maroon and gold, 4 February' },
  { key: 'eid', label: 'Eid', hint: 'Deep teal and gold' },
  { key: 'deepavali', label: 'Deepavali', hint: 'Saffron and plum, October or November' },
  { key: 'christmas', label: 'Christmas', hint: 'Red and green, December' },
  { key: 'sale', label: 'Mega sale', hint: 'Bold black and red for big discounts' },
] as const;
export type FestivalKey = (typeof FESTIVALS)[number]['key'];
export const FESTIVAL_KEYS = FESTIVALS.map((f) => f.key) as [FestivalKey, ...FestivalKey[]];

/** `off` never shows it, `on` shows it until switched off, `scheduled` follows the dates (Sri Lanka time). */
export const FESTIVAL_MODES = ['off', 'on', 'scheduled'] as const;
export type FestivalMode = (typeof FESTIVAL_MODES)[number];

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
  storeName: string;
  tagline?: string;
  /** Path of the logo in the media bucket (`site/<id>.<ext>`). */
  logoPath?: string;
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
    /** The owner's brand colour (`#rrggbb`). Buttons and links use it; empty = the default black. */
    brandColor?: string;
    festival: { mode: FestivalMode; key: FestivalKey; startsOn?: string; endsOn?: string };
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
export interface PublicSite {
  settings: SiteSettings;
  /** Banners that are active today, in order. */
  banners: Banner[];
  /** The festival look in force right now, if any. */
  festival: FestivalKey | null;
  pages: { slug: PageSlug; title: string }[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'Aussie Cosmetics',
  announcement: { enabled: true, text: 'Cash on delivery · Island-wide delivery' },
  theme: {
    defaultMode: 'light',
    festival: { mode: 'off', key: 'avurudu' },
  },
  home: { showCategories: true, showNewIn: true, showTrustBar: true },
};
