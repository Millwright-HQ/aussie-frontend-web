'use client';

import { Alert, Button } from '@aussie/ui';
import { useActionState } from 'react';
import { type CancelState, cancelOrderAction } from './actions';

export function CancelOrder({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelOrderAction.bind(null, orderId),
    {},
  );
  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.ok}</Alert>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? 'Cancelling…' : 'Cancel this order'}
      </Button>
      <p className="text-xs text-muted">You can cancel until we confirm the order.</p>
    </form>
  );
}
