'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-reads the page every few seconds so a new code appears without reloading. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm hover:bg-surface-muted"
    >
      <RefreshCw aria-hidden size={14} /> Refresh
    </button>
  );
}
