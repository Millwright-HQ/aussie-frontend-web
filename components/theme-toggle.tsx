'use client';

import type { ThemeMode } from '@aussie/shared-types';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { THEME_COOKIE, type ThemeScope } from '@/lib/theme-shared';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Light / dark switch. The choice is kept in a cookie (so the server renders the right colours on
 * the next page) and applied at once to the page's `[data-theme-root]` element.
 */
export function ThemeToggle({
  scope,
  initial,
  className,
}: {
  scope: ThemeScope;
  initial: ThemeMode;
  className?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>(initial);
  const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';

  function toggle() {
    // eslint-disable-next-line security/detect-object-injection -- scope is a code constant
    document.cookie = `${THEME_COOKIE[scope]}=${next}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${
      window.location.protocol === 'https:' ? '; Secure' : ''
    }`;
    document.querySelectorAll(`[data-theme-root="${scope}"]`).forEach((el) => {
      el.setAttribute('data-theme', next);
    });
    setMode(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={
        className ??
        'inline-flex size-11 items-center justify-center rounded-full text-text hover:bg-surface-muted'
      }
    >
      {mode === 'dark' ? (
        <Sun aria-hidden size={20} strokeWidth={1.5} />
      ) : (
        <Moon aria-hidden size={20} strokeWidth={1.5} />
      )}
    </button>
  );
}
