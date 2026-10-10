'use client';

import { Button, Field, Input } from '@aussie/ui';
import { useActionState } from 'react';
import { type UnlockState, unlockSiteAction } from './actions';

export function UnlockForm() {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockSiteAction, {});
  return (
    <form action={action} className="mt-8 space-y-3 text-left">
      <Field id="password" label="Access password" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          invalid={!!state.error}
          required
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Checking…' : 'Enter the shop'}
      </Button>
    </form>
  );
}
