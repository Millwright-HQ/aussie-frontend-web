'use client';

import { useActionState } from 'react';
import { NewPasswordPair } from '@/components/password-field';
import { Alert, Button, Field, Input } from '../_ui';
import type { FormState } from './actions';

export interface FieldSpec {
  id: string;
  label: string;
  type?: 'email' | 'password' | 'text';
  autoComplete?: string;
  inputMode?: 'numeric';
  hint?: string;
  pattern?: string;
  maxLength?: number;
}

const adminInput =
  'block h-10 w-full rounded-sm border border-border bg-surface px-3 pr-11 text-sm text-text shadow-sm aria-[invalid=true]:border-danger';

/** Shared single-step auth form: renders fields, server-side errors, and a pending state. */
export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  passwordPair,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  fields: FieldSpec[];
  submitLabel: string;
  hidden?: Record<string, string> | undefined;
  /** Replaces the fields with "new password" + "confirm", with a live checklist. */
  passwordPair?: { minLength: number } | undefined;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {passwordPair ? (
        <NewPasswordPair
          minLength={passwordPair.minLength}
          errors={state.fieldErrors}
          inputClassName={adminInput}
          labelClassName="block text-[13px] font-medium"
          idPrefix="admin-new"
        />
      ) : (
        fields.map((f, i) => {
          const error = state.fieldErrors?.[f.id];
          return (
            <Field key={f.id} id={f.id} label={f.label} hint={f.hint} error={error}>
              <Input
                id={f.id}
                type={f.type ?? 'text'}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
                pattern={f.pattern}
                maxLength={f.maxLength}
                required
                invalid={Boolean(error)}
                hasHint={Boolean(f.hint)}
                autoFocus={i === 0}
              />
            </Field>
          );
        })
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Please wait…' : submitLabel}
      </Button>
    </form>
  );
}
