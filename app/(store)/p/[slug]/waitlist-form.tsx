'use client';

import { Button, Field, Input } from '@aussie/ui';
import { BellRing } from 'lucide-react';
import { useActionState } from 'react';
import { joinWaitlistAction, type WaitlistState } from './actions';

/** Shown instead of "Add to bag" for a sold-out variant. Remounted per variant. */
export function WaitlistForm({
  productId,
  variantId,
  slug,
  className,
}: {
  productId: string;
  variantId: string;
  slug: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlistAction, {});
  return (
    <form action={action} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="rounded-md border border-border bg-surface-muted p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BellRing aria-hidden size={16} /> Sold out. Tell me when it is back
        </p>
        {state.ok ? (
          <p className="mt-3 text-sm text-success" role="status">
            {state.ok}
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field id={`wl-email-${variantId}`} label="Email" className="sm:col-span-2">
              <Input
                id={`wl-email-${variantId}`}
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field id={`wl-name-${variantId}`} label="Name" optional>
              <Input id={`wl-name-${variantId}`} name="name" autoComplete="name" maxLength={100} />
            </Field>
            <Field id={`wl-phone-${variantId}`} label="Mobile" optional>
              <Input
                id={`wl-phone-${variantId}`}
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="077 123 4567"
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {pending ? 'Saving…' : 'Notify me'}
              </Button>
              {state.error && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {state.error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
