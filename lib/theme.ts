import 'server-only';
import type { ThemeMode } from '@aussie/shared-types';
import { cookies } from 'next/headers';
import { isThemeMode, THEME_COOKIE, type ThemeScope } from './theme-shared';

/**
 * The visitor's saved choice, or `fallback` (the admin's default for the shop, or dark for the
 * admin). Read on the server so the right colours are in the first paint, with no flash.
 */
export async function readTheme(scope: ThemeScope, fallback: ThemeMode): Promise<ThemeMode> {
  // eslint-disable-next-line security/detect-object-injection -- scope is a code constant
  const saved = (await cookies()).get(THEME_COOKIE[scope])?.value;
  return isThemeMode(saved) ? saved : fallback;
}
