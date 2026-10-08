'use client';

import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { OpenHold } from '@/lib/holds';

const REFRESH_MS = 30_000;

const minutes = (ms: number) => Math.max(0, Math.ceil(ms / 60_000));

/**
 * A small clock in the corner of the orders page. A red dot means customers are in checkout right
 * now (their items are taken off sale until they order or the time runs out). Click for what is
 * held and for how long. No names: a hold belongs to nobody until the order is placed.
 */
export function HoldsIndicator({ holds }: { holds: OpenHold[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number>();
  const box = useRef<HTMLDivElement>(null);

  // Times are worked out in the browser only, so server and browser text never differ.
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(tick);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    holds.length === 0
      ? 'No one is in checkout right now'
      : `${holds.length} ${holds.length === 1 ? 'checkout' : 'checkouts'} open right now`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="relative inline-flex size-10 items-center justify-center rounded-[10px] border border-border bg-surface text-muted shadow-sm hover:text-text"
      >
        <Clock aria-hidden size={17} />
        {holds.length > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface bg-danger"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Open checkouts"
          className="absolute right-0 z-20 mt-2 w-[min(92vw,30rem)] rounded-xl border border-border bg-surface p-4 text-sm shadow-lg"
        >
          <p className="font-medium">In checkout now</p>
          <p className="mt-0.5 text-xs text-muted">
            These items are held for the customer and come back on sale if no order is placed in
            time. When they order, the hold becomes the order.
          </p>
          {holds.length === 0 ? (
            <p className="mt-4 text-muted">Nobody is in checkout right now.</p>
          ) : (
            <table className="mt-3 w-full text-left">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-1 font-medium">Held items</th>
                  <th className="pb-1 text-right font-medium">Started</th>
                  <th className="pb-1 text-right font-medium">Back on sale</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => (
                  <tr key={h.holdId} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      {h.lines.map((l) => (
                        <div key={l.variantId}>
                          <span className="tabular font-medium">{l.qty}×</span> {l.name}
                          {l.label && <span className="text-muted"> · {l.label}</span>}
                        </div>
                      ))}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap text-muted tabular">
                      {now === undefined ? '' : `${minutes(now - Date.parse(h.createdAt))} min ago`}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap tabular">
                      {now === undefined ? '' : `in ${minutes(Date.parse(h.expiresAt) - now)} min`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
