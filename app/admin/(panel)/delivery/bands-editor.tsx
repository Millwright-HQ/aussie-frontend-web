'use client';

import type { DeliveryBand } from '@aussie/shared-types';
import { Button, Input } from '@aussie/ui';
import { useState } from 'react';

interface Row {
  key: number;
  maxWeightG: string;
  fee: string;
}

let seq = 0;
const toRow = (b?: DeliveryBand): Row => ({
  key: ++seq,
  maxWeightG: b ? String(b.maxWeightG) : '',
  fee: b ? (b.feeCents / 100).toFixed(2) : '',
});

/**
 * Editable weight/fee rows for one zone. Submits as a hidden JSON field (`bands`, fees in cents)
 * inside an ActionForm; the server re-validates everything.
 */
export function BandsEditor({ zoneId, bands }: { zoneId: string; bands: DeliveryBand[] }) {
  const [rows, setRows] = useState<Row[]>(() => (bands.length ? bands.map(toRow) : [toRow()]));
  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = rows
    .filter((r) => r.maxWeightG.trim() !== '' || r.fee.trim() !== '')
    .map((r) => ({
      maxWeightG: r.maxWeightG.trim() === '' ? Number.NaN : Number(r.maxWeightG),
      feeCents:
        r.fee.trim() === '' ? Number.NaN : Math.round(Number(r.fee.replace(/,/g, '')) * 100),
    }));

  return (
    <div className="space-y-2">
      {/* NaN serialises to null, which the server rejects with a row-numbered message. */}
      <input type="hidden" name="bands" value={JSON.stringify(payload)} />
      <div className="grid grid-cols-[1fr_1fr_5.5rem] gap-2 text-xs font-medium text-muted">
        <span>Up to weight (g)</span>
        <span>Fee (Rs)</span>
        <span className="sr-only">Remove</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[1fr_1fr_5.5rem] items-center gap-2">
          <Input
            id={`b-${zoneId}-${r.key}-w`}
            name={`band-weight-${i}`}
            aria-label={`Row ${i + 1} up to weight in grams`}
            inputMode="numeric"
            value={r.maxWeightG}
            onChange={(e) => update(r.key, { maxWeightG: e.target.value })}
          />
          <Input
            id={`b-${zoneId}-${r.key}-f`}
            name={`band-fee-${i}`}
            aria-label={`Row ${i + 1} fee in rupees`}
            inputMode="decimal"
            value={r.fee}
            onChange={(e) => update(r.key, { fee: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={rows.length === 1}
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
          >
            Remove
            <span className="sr-only"> row {i + 1}</span>
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((rs) => [...rs, toRow()])}
      >
        Add a band
      </Button>
    </div>
  );
}
