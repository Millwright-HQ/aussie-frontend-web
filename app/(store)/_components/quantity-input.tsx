'use client';

import { MAX_QTY_PER_LINE } from '@aussie/validation';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

/** The most one line may hold: what is in stock, never more than an order line allows. */
export const qtyLimit = (inStock?: number) =>
  Math.max(1, Math.min(MAX_QTY_PER_LINE, inStock ?? MAX_QTY_PER_LINE));

/**
 * Typed quantity with − / + buttons. Starts at `defaultValue`, and whatever is typed is held
 * between 1 and the units in stock (so a shopper can never ask for more than exists).
 */
export function QuantityInput({
  id,
  name = 'qty',
  defaultValue = 1,
  max,
  disabled,
  compact,
}: {
  id: string;
  name?: string;
  defaultValue?: number;
  /** Units in stock (undefined = unknown, capped by the per-line limit only). */
  max?: number | undefined;
  disabled?: boolean;
  compact?: boolean;
}) {
  const limit = qtyLimit(max);
  const clamp = (n: number) => Math.min(limit, Math.max(1, Math.trunc(n) || 1));
  const [value, setValue] = useState(String(clamp(defaultValue)));
  const n = Number(value);
  // If the stock under the field shrinks (another variant, or someone else bought some), pull the number down with it.
  useEffect(() => {
    setValue((v) => (v !== '' && Number(v) > limit ? String(limit) : v));
  }, [limit]);
  const size = compact ? 'size-9' : 'size-12';

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || n <= 1}
        onClick={() => setValue(String(clamp(n - 1)))}
        className={`${size} inline-flex items-center justify-center rounded-sm border border-border bg-surface hover:bg-surface-muted disabled:opacity-40`}
      >
        <Minus aria-hidden size={16} />
      </button>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Quantity"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
          // Typing past the stock snaps straight to the most that is available.
          setValue(digits === '' ? '' : String(Math.min(limit, Number(digits))));
        }}
        onBlur={() => setValue(String(clamp(Number(value))))}
        className={`${size} w-14 rounded-sm border border-border bg-surface text-center tabular`}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || n >= limit}
        onClick={() => setValue(String(clamp(n + 1)))}
        className={`${size} inline-flex items-center justify-center rounded-sm border border-border bg-surface hover:bg-surface-muted disabled:opacity-40`}
      >
        <Plus aria-hidden size={16} />
      </button>
      {max !== undefined && max > 0 && max <= MAX_QTY_PER_LINE && n >= max && (
        <span className="ml-2 text-xs text-muted">Max {max}</span>
      )}
    </div>
  );
}
