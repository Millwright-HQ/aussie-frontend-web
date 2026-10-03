import 'server-only';
import {
  DEFAULT_SITE_SETTINGS,
  type InfoPage,
  type PageSlug,
  type PublicSite,
} from '@aussie/shared-types';
import { API_URL } from './api';

/** Every storefront content read carries this tag; admin edits call updateTag(CONTENT_TAG). */
export const CONTENT_TAG = 'content';

/** What the shop shows when the content service cannot be reached: the shop must still open. */
export const FALLBACK_SITE: PublicSite = {
  settings: DEFAULT_SITE_SETTINGS,
  banners: [],
  festival: null,
  pages: [],
};

/** Store details, live banners, the festival look and page links (cached for a minute). */
export async function getSite(): Promise<PublicSite> {
  if (!API_URL) return FALLBACK_SITE;
  try {
    const res = await fetch(`${API_URL}/v1/content/site`, {
      next: { revalidate: 60, tags: [CONTENT_TAG] },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return FALLBACK_SITE;
    return (await res.json()) as PublicSite;
  } catch {
    return FALLBACK_SITE;
  }
}

/** An information page, or null when it does not exist or is hidden. */
export async function getInfoPage(slug: PageSlug): Promise<InfoPage | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/content/pages/${slug}`, {
      next: { revalidate: 60, tags: [CONTENT_TAG] },
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok ? ((await res.json()) as InfoPage) : null;
  } catch {
    return null;
  }
}

/** Address of a picture in the media bucket (served by the CDN). */
export const sitePictureUrl = (path: string) => `${process.env.NEXT_PUBLIC_CDN_URL ?? ''}/${path}`;
