'use client';

import type { ADJUSTMENT_REASONS } from '@aussie/shared-types';
import { Minus, Plus } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import type { ActionState } from '@/app/admin/(panel)/actions';
import { Button } from '@/app/admin/_ui';

type Reason = (typeof ADJUSTMENT_REASONS)[number];

const REASONS: { value: Reason; label: string; sign: 1 | -1 | 0 }[] = [
  { value: 'RECEIVED', label: 'Received', sign: 1 },
  { value: 'RETURNED', label: 'Customer return', sign: 1 },
  { value: 'DAMAGED', label: 'Damaged / lost', sign: -1 },
  { value: 'CORRECTION', label: 'Count correction', sign: 0 },
];

const field =
  'h-9 rounded-[10px] border border-border bg-surface px-2.5 text-sm shadow-sm hover:border-text/30 focus-visible:border-primary focus-visible:outline-2';

/**
 * One-line stock change for a variant: how many, why. Positive reasons add, "damaged" removes
 * (the sign is applied for you), a count correction can go either way.
 */
export function QuickAdjust({
  action,
  sku,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  sku: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [reason, setReason] = useState<Reason>('RECEIVED');
  const [units, setUnits] = useState('');
  const sign = REASONS.find((r) => r.value === reason)?.sign ?? 0;

  useEffect(() => {
    if (state.ok) setUnits('');
  }, [state]);

  const n = Number(units);
  const delta = !units || !Number.isFinite(n) ? '' : String(sign === 0 ? n : sign * Math.abs(n));

  return (
    <form action={formAction} className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          name="reason"
          aria-label={`Reason for ${sku}`}
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
          className={field}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted"
          >
            {sign > 0 ? (
              <Plus size={13} />
            ) : sign < 0 ? (
              <Minus size={13} />
            ) : (
              <span className="text-xs">±</span>
            )}
          </span>
          <input
            type="number"
            inputMode="numeric"
            step={1}
            min={sign === 0 ? undefined : 1}
            aria-label={`Units for ${sku}`}
            placeholder="Units"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className={`${field} w-24 pl-6 tabular`}
            required
          />
        </span>
        <input type="hidden" name="delta" value={delta} />
        <Button type="submit" size="sm" disabled={pending || !units}>
          {pending ? 'Saving…' : 'Apply'}
        </Button>
      </div>
      <p
        className={`mt-1 min-h-4 text-xs ${state.error ? 'text-danger' : 'text-success'}`}
        aria-live="polite"
      >
        {state.error ?? state.ok ?? ''}
      </p>
    </form>
  );
}
