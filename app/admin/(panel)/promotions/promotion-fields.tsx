'use client';

import type { Promotion, PromotionKind, PromotionScope } from '@aussie/shared-types';
import { useMemo, useState } from 'react';
import { Checkbox, Field, Input, Select } from '@/app/admin/_ui';
import { centsToRupees, toColomboInput } from '@/lib/promotions';

export interface PickOption {
  id: string;
  label: string;
}

/** Fields of the promotion form (create and edit). Which pickers show depends on the type and scope. */
export function PromotionFields({
  promo,
  categories,
  products,
}: {
  promo?: Promotion;
  categories: PickOption[];
  products: PickOption[];
}) {
  const [kind, setKind] = useState<PromotionKind>(promo?.kind ?? 'PERCENT');
  const [scope, setScope] = useState<PromotionScope>(promo?.scope ?? 'ORDER');
  const [chosen, setChosen] = useState<Set<string>>(new Set(promo?.targetIds ?? []));
  const [search, setSearch] = useState('');
  const key = promo?.id ?? 'new';

  const effectiveScope = kind === 'FREE_DELIVERY' ? 'ORDER' : scope;
  const options = effectiveScope === 'PRODUCTS' ? products : categories;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {promo ? (
          <Field id={`code-${key}`} label="Code" hint="The code cannot be changed once created.">
            <Input id={`code-${key}`} value={promo.code} readOnly disabled hasHint />
          </Field>
        ) : (
          <Field
            id="code"
            label="Code"
            hint="What customers type, e.g. EID10. Letters, numbers, - or _ (not case sensitive)."
          >
            <Input
              id="code"
              name="code"
              required
              maxLength={24}
              autoCapitalize="characters"
              hasHint
            />
          </Field>
        )}
        <Field id={`name-${key}`} label="Name" hint="Only you see this.">
          <Input
            id={`name-${key}`}
            name="name"
            defaultValue={promo?.name}
            required
            maxLength={80}
            hasHint
          />
        </Field>
      </div>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-[13px] font-medium">Discount</legend>
        <Field id={`kind-${key}`} label="Type">
          <Select
            id={`kind-${key}`}
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as PromotionKind)}
          >
            <option value="PERCENT">Percentage off</option>
            <option value="FIXED">Fixed amount off</option>
            <option value="FREE_DELIVERY">Free delivery</option>
          </Select>
        </Field>
        {kind !== 'FREE_DELIVERY' && (
          <Field
            id={`value-${key}`}
            label={kind === 'PERCENT' ? 'Percentage (%)' : 'Amount off (LKR)'}
            hint={
              kind === 'PERCENT'
                ? 'A whole number from 1 to 90.'
                : 'Taken off the eligible products. Never more than their total.'
            }
          >
            <Input
              id={`value-${key}`}
              name="value"
              type="number"
              inputMode="decimal"
              min={kind === 'PERCENT' ? 1 : 0.01}
              max={kind === 'PERCENT' ? 90 : undefined}
              step={kind === 'PERCENT' ? 1 : 0.01}
              defaultValue={
                promo && promo.kind === kind
                  ? kind === 'PERCENT'
                    ? promo.value
                    : centsToRupees(promo.value)
                  : ''
              }
              required
              hasHint
            />
          </Field>
        )}
      </fieldset>

      {kind === 'FREE_DELIVERY' ? (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-muted">
          Removes the delivery fee for the whole order. Products are not discounted.
        </p>
      ) : (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-[13px] font-medium">Applies to</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                ['ORDER', 'The whole order'],
                ['PRODUCTS', 'Chosen products'],
                ['CATEGORIES', 'Chosen categories'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  value={value}
                  checked={scope === value}
                  onChange={() => {
                    setScope(value);
                    setChosen(new Set());
                    setSearch('');
                  }}
                  className="size-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          {effectiveScope !== 'ORDER' && (
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Input
                  id={`search-${key}`}
                  name="search-targets"
                  type="search"
                  placeholder={`Search ${effectiveScope === 'PRODUCTS' ? 'products' : 'categories'}`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                />
                <span className="shrink-0 text-xs text-muted">{chosen.size} chosen</span>
              </div>
              <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {shown.map((o) => (
                  <li key={o.id}>
                    <Checkbox
                      id={`target-${key}-${o.id}`}
                      name="targetIds"
                      value={o.id}
                      checked={chosen.has(o.id)}
                      onChange={() => toggle(o.id)}
                      label={o.label}
                    />
                  </li>
                ))}
                {shown.length === 0 && <li className="text-sm text-muted">Nothing found.</li>}
              </ul>
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-[13px] font-medium">Limits (all optional)</legend>
        <Field
          id={`maxUses-${key}`}
          label="Total uses"
          optional
          hint="Leave empty for unlimited. A cancelled order gives its use back."
        >
          <Input
            id={`maxUses-${key}`}
            name="maxUses"
            type="number"
            min={1}
            step={1}
            defaultValue={promo?.maxUses}
            hasHint
          />
        </Field>
        <Field
          id={`minSubtotal-${key}`}
          label="Minimum order (LKR)"
          optional
          hint="Products total, after the store-wide discount, needed to use the code."
        >
          <Input
            id={`minSubtotal-${key}`}
            name="minSubtotal"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            defaultValue={centsToRupees(promo?.minSubtotalCents)}
            hasHint
          />
        </Field>
        {kind !== 'FREE_DELIVERY' && (
          <Field
            id={`maxDiscount-${key}`}
            label="Maximum discount per order (LKR)"
            optional
            hint="A cap, e.g. 10% off but never more than 1,000."
          >
            <Input
              id={`maxDiscount-${key}`}
              name="maxDiscount"
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              defaultValue={centsToRupees(promo?.maxDiscountCents)}
              hasHint
            />
          </Field>
        )}
        <Field id={`startsAt-${key}`} label="Starts" optional hint="Sri Lanka time. Empty = now.">
          <Input
            id={`startsAt-${key}`}
            name="startsAt"
            type="datetime-local"
            defaultValue={toColomboInput(promo?.startsAt)}
            hasHint
          />
        </Field>
        <Field id={`endsAt-${key}`} label="Ends" optional hint="Sri Lanka time. Empty = no end.">
          <Input
            id={`endsAt-${key}`}
            name="endsAt"
            type="datetime-local"
            defaultValue={toColomboInput(promo?.endsAt)}
            hasHint
          />
        </Field>
      </fieldset>

      <Checkbox
        id={`active-${key}`}
        name="active"
        defaultChecked={promo?.active ?? true}
        label="Active (untick to pause the code without deleting it)"
      />
    </div>
  );
}
