'use client';

import { Alert, Button, Field, Input } from '@aussie/ui';
import { useActionState } from 'react';
import { OrderSummary } from '../_components/order-summary';
import { type TrackState, trackAction } from './actions';

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackAction, {});
  return (
    <div className="space-y-8">
      <form
        action={action}
        noValidate
        className="space-y-4 rounded-md border border-border bg-surface p-6"
      >
        {state.error && <Alert>{state.error}</Alert>}
        <Field id="orderNumber" label="Order number" hint="Like AC-26-00042">
          <Input id="orderNumber" name="orderNumber" autoCapitalize="characters" required hasHint />
        </Field>
        <Field id="phone" label="Mobile number used for the order">
          <Input id="phone" name="phone" type="tel" placeholder="077 123 4567" required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? 'Looking…' : 'Track order'}
        </Button>
      </form>
      {state.order && (
        <div className="rounded-md border border-border bg-surface p-6">
          <OrderSummary order={state.order} />
        </div>
      )}
    </div>
  );
}
