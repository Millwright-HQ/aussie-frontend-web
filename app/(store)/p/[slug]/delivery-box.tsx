'use client';

import { Button, Select } from '@aussie/ui';
import { type FormEvent, useState, useTransition } from 'react';
import { type EstimateState, estimateDeliveryAction } from './actions';

export interface DistrictChoice {
  code: string;
  name: string;
}

/** Delivery fee checker. Remounted (key) when the shopper picks another variant. */
export function DeliveryBox({
  slug,
  variantId,
  districts,
}: {
  slug: string;
  variantId: string;
  districts: DistrictChoice[];
}) {
  const [district, setDistrict] = useState('');
  const [state, setState] = useState<EstimateState & { district?: string }>({});
  const [pending, startTransition] = useTransition();

  // Called directly (not as a form action) so React does not reset the chosen district.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await estimateDeliveryAction(slug, variantId, {}, form);
      setState({ ...result, district: districts.find((d) => d.code === district)?.name });
    });
  }

  if (districts.length === 0) return null;
  return (
    <form onSubmit={submit} className="mt-6 rounded-md border border-border p-4">
      <p className="text-sm font-medium">Delivery to</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select
          id={`district-${variantId}`}
          name="district"
          aria-label="Your district"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setState({});
          }}
          className="w-48"
          required
        >
          <option value="" disabled>
            Choose your district
          </option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Checking…' : 'Check fee'}
        </Button>
      </div>
      <p className="mt-2 min-h-5 text-sm" aria-live="polite">
        {state.ok && (
          <span className="text-text">
            {state.district}: {state.ok}
          </span>
        )}
        {state.error && <span className="text-danger">{state.error}</span>}
      </p>
    </form>
  );
}
