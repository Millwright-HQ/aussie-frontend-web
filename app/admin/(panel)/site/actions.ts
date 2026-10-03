'use server';

import {
  bannerIdSchema,
  bannerInputSchema,
  pageInputSchema,
  pageSlugSchema,
  siteSettingsSchema,
  siteUploadRequestSchema,
} from '@aussie/validation';
import { revalidatePath, updateTag } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { CONTENT_TAG } from '@/lib/content';
import type { ActionState } from '../actions';

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};
const flag = (form: FormData, key: string) => form.get(key) === 'on';
const whole = (form: FormData, key: string) => {
  const v = text(form, key).trim();
  return v === '' ? Number.NaN : Number(v);
};

/** Runs an API call, refreshes what the shop shows, and turns failures into a message. */
async function save(
  call: () => Promise<unknown>,
  ok: string,
  paths: string[],
): Promise<ActionState> {
  try {
    await call();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  updateTag(CONTENT_TAG); // the shop shows the change on its next request
  for (const p of paths) revalidatePath(p);
  return { ok };
}

// ── Pictures ────────────────────────────────────────────────────────────────

export type UploadTicket =
  { error: string } | { path: string; upload: { url: string; fields: Record<string, string> } };

/** A one-time slot to upload a logo or banner picture straight to storage. */
export async function requestSiteUploadAction(
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const parsed = siteUploadRequestSchema.safeParse({ contentType, size });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the picture' };
  try {
    return await api<{ path: string; upload: { url: string; fields: Record<string, string> } }>(
      'admin',
      '/v1/content/admin/uploads',
      { method: 'POST', body: parsed.data },
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
}

// ── Store details, announcement and appearance ──────────────────────────────

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = siteSettingsSchema.safeParse({
    storeName: text(form, 'storeName'),
    tagline: text(form, 'tagline'),
    logoPath: flag(form, 'removeLogo') ? '' : text(form, 'logoPath'),
    phone: text(form, 'phone'),
    whatsapp: text(form, 'whatsapp'),
    email: text(form, 'email'),
    address: text(form, 'address'),
    facebook: text(form, 'facebook'),
    instagram: text(form, 'instagram'),
    tiktok: text(form, 'tiktok'),
    youtube: text(form, 'youtube'),
    footerNote: text(form, 'footerNote'),
    announcement: {
      enabled: flag(form, 'announcementEnabled'),
      text: text(form, 'announcementText'),
      href: text(form, 'announcementHref'),
    },
    theme: {
      defaultMode: text(form, 'defaultMode'),
      brandColor: flag(form, 'useBrandColor') ? text(form, 'brandColor') : '',
      festival: {
        mode: text(form, 'festivalMode'),
        key: text(form, 'festivalKey'),
        startsOn: text(form, 'festivalStartsOn'),
        endsOn: text(form, 'festivalEndsOn'),
      },
    },
    home: {
      showCategories: flag(form, 'showCategories'),
      showNewIn: flag(form, 'showNewIn'),
      showTrustBar: flag(form, 'showTrustBar'),
    },
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return save(
    () => api('admin', '/v1/content/admin/settings', { method: 'PUT', body: parsed.data }),
    'Saved. The shop shows the change within a minute.',
    ['/admin/site'],
  );
}

// ── Banners ─────────────────────────────────────────────────────────────────

function bannerFields(form: FormData) {
  return bannerInputSchema.safeParse({
    imagePath: text(form, 'imagePath'),
    alt: text(form, 'alt'),
    title: text(form, 'title'),
    subtitle: text(form, 'subtitle'),
    buttonLabel: text(form, 'buttonLabel'),
    href: text(form, 'href'),
    sortOrder: whole(form, 'sortOrder'),
    active: flag(form, 'active'),
    startsOn: text(form, 'startsOn'),
    endsOn: text(form, 'endsOn'),
  });
}

export async function createBannerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = bannerFields(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return save(
    () => api('admin', '/v1/content/admin/banners', { method: 'POST', body: parsed.data }),
    'Banner added.',
    ['/admin/banners'],
  );
}

export async function updateBannerAction(
  bannerId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!bannerIdSchema.safeParse(bannerId).success) return { error: 'Invalid banner' };
  const parsed = bannerFields(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return save(
    () =>
      api('admin', `/v1/content/admin/banners/${bannerId}`, { method: 'PUT', body: parsed.data }),
    'Banner saved.',
    ['/admin/banners'],
  );
}

export async function deleteBannerAction(
  bannerId: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  if (!bannerIdSchema.safeParse(bannerId).success) return { error: 'Invalid banner' };
  return save(
    () => api('admin', `/v1/content/admin/banners/${bannerId}`, { method: 'DELETE' }),
    'Banner removed.',
    ['/admin/banners'],
  );
}

// ── Information pages ───────────────────────────────────────────────────────

export async function savePageAction(
  slug: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const page = pageSlugSchema.safeParse(slug);
  if (!page.success) return { error: 'Invalid page' };
  const parsed = pageInputSchema.safeParse({
    title: text(form, 'title'),
    body: text(form, 'body'),
    published: flag(form, 'published'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return save(
    () =>
      api('admin', `/v1/content/admin/pages/${page.data}`, { method: 'PUT', body: parsed.data }),
    'Page saved.',
    ['/admin/pages', `/admin/pages/${page.data}`],
  );
}
