'use client';

import type { AttributeDef } from '@aussie/shared-types';
import { Checkbox, Field, Input, Select, Textarea } from '@aussie/ui';
import type { AttributeField, AttributeFields } from '@/lib/editor-model';

/** One input per attribute the product's categories ask for, chosen by the attribute's type. */
export function AttributeFieldsEditor({
  defs,
  values,
  errors,
  onChange,
}: {
  defs: AttributeDef[];
  values: AttributeFields;
  errors: Map<string, string>;
  onChange: (key: string, value: AttributeField) => void;
}) {
  if (defs.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        The chosen categories have no extra fields. Add some under Categories.
      </p>
    );
  }
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {defs.map((def) => {
        const id = `attr-${def.key}`;
        const error = errors.get(`attributes.${def.key}`);
        const raw = Object.entries(values).find(([k]) => k === def.key)?.[1];
        const text = typeof raw === 'string' ? raw : '';
        const label = def.type === 'number' && def.unit ? `${def.label} (${def.unit})` : def.label;
        const common = { id, label, error, optional: !def.required };

        if (def.type === 'text' && def.long) {
          return (
            <Field key={def.key} {...common} className="md:col-span-2">
              <Textarea
                id={id}
                rows={3}
                value={text}
                onChange={(e) => onChange(def.key, e.target.value)}
                invalid={!!error}
              />
            </Field>
          );
        }
        if (def.type === 'text' || def.type === 'number') {
          return (
            <Field key={def.key} {...common}>
              <Input
                id={id}
                inputMode={def.type === 'number' ? 'decimal' : undefined}
                value={text}
                onChange={(e) => onChange(def.key, e.target.value)}
                invalid={!!error}
              />
            </Field>
          );
        }
        if (def.type === 'boolean') {
          return (
            <Field key={def.key} {...common}>
              <Select
                id={id}
                value={text}
                onChange={(e) => onChange(def.key, e.target.value)}
                invalid={!!error}
              >
                <option value="">Not specified</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Field>
          );
        }
        if (def.type === 'choice') {
          return (
            <Field key={def.key} {...common}>
              <Select
                id={id}
                value={text}
                onChange={(e) => onChange(def.key, e.target.value)}
                invalid={!!error}
              >
                <option value="">Not specified</option>
                {(def.choices ?? []).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          );
        }
        // multichoice
        const picked = Array.isArray(raw) ? raw : [];
        return (
          <fieldset key={def.key} className="md:col-span-2">
            <legend className="text-sm font-medium">
              {def.label}
              {!def.required && <span className="font-normal text-muted"> (optional)</span>}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(def.choices ?? []).map((c) => (
                <Checkbox
                  key={c.value}
                  id={`${id}-${c.value}`}
                  label={c.label}
                  checked={picked.includes(c.value)}
                  onChange={() =>
                    onChange(
                      def.key,
                      picked.includes(c.value)
                        ? picked.filter((v) => v !== c.value)
                        : [...picked, c.value],
                    )
                  }
                />
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}
