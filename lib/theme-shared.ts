import type { ThemeMode } from '@aussie/shared-types';

/** Each side of the site remembers its own choice, so the admin can stay dark while the shop is light. */
export type ThemeScope = 'store' | 'admin';

export const THEME_COOKIE: Record<ThemeScope, string> = {
  store: 'theme-store',
  admin: 'theme-admin',
};

export const isThemeMode = (v: string | undefined): v is ThemeMode => v === 'light' || v === 'dark';
