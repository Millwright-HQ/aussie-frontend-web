'use client';

import { ADMIN_PASSWORD_MIN } from '@aussie/validation';
import { useActionState } from 'react';
import { NewPasswordPair } from '@/components/password-field';
import { Alert, Button, Field, Input } from '@/app/admin/_ui';
import type { PasswordState } from './actions';

const adminInput =
  'block h-10 w-full rounded-sm border border-border bg-surface px-3 pr-11 text-sm text-text shadow-sm aria-[invalid=true]:border-danger';

/** Change your own password: current one first, then the new one with a live checklist. */
export function PasswordForm({
  action,
}: {
  action: (prev: PasswordState, form: FormData) => Promise<PasswordState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      // Remount after success so the typed passwords are cleared.
      key={state.ok ? 'done' : 'form'}
      action={formAction}
      className="space-y-5"
      noValidate
    >
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.ok}</Alert>}
      <Field
        id="currentPassword"
        label="Current password"
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.fieldErrors?.currentPassword)}
        />
      </Field>
      <NewPasswordPair
        minLength={ADMIN_PASSWORD_MIN}
        errors={state.fieldErrors}
        inputClassName={adminInput}
        labelClassName="block text-[13px] font-medium"
        idPrefix="profile"
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}
