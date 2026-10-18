'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Reports to the shop's own server (never to a third party). No cookies, nothing personal. */
function send(body: Record<string, unknown>) {
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/t', blob)) {
      void fetch('/api/t', { method: 'POST', body: blob, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // Analytics must never break the page.
  }
}

/** True the first time in this tab: only the first page of a visit carries where the person came from. */
function firstPageOfVisit(): boolean {
  try {
    if (sessionStorage.getItem('ozara-visit')) return false;
    sessionStorage.setItem('ozara-visit', '1');
  } catch {
    // Storage blocked: count every page as part of the same visit.
    return false;
  }
  return true;
}

/** Counts a page view whenever the shop page changes. Renders nothing. */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const entry = firstPageOfVisit();
    let ref: string | undefined;
    let campaign: string | undefined;
    if (entry) {
      try {
        const from = document.referrer ? new URL(document.referrer) : undefined;
        if (from && from.host !== location.host) ref = from.href;
        const q = new URLSearchParams(location.search);
        campaign = q.get('utm_source') ?? q.get('utm_campaign') ?? undefined;
      } catch {
        // an odd referrer is simply ignored
      }
    }
    send({ type: 'view', path: pathname, ...(entry ? { entry: true, ref, campaign } : {}) });
  }, [pathname]);
  return null;
}

/** Counts a view of one product (placed on the product page). */
export function TrackProduct({ productId }: { productId: string }) {
  useEffect(() => {
    send({ type: 'product', productId });
  }, [productId]);
  return null;
}
