'use client';

import type { PaymentMethod } from '@aussie/shared-types';
import { Alert, Button, Field, Input, Textarea } from '@aussie/ui';
import { useActionState } from 'react';
import { type CheckoutState, placeOrderAction } from './actions';

export interface CheckoutDefaults {
  fullName: string;
  phone: string;
  email: string;
}

/** Contact + address. The district was chosen above (hidden here) so the fee shown matches the order. */
export function CheckoutForm({
  district,
  districtName,
  idempotencyKey,
  defaults,
  disabled,
  paymentMethod,
}: {
  district?: string;
  districtName?: string;
  idempotencyKey: string;
  defaults: CheckoutDefaults;
  disabled: boolean;
  paymentMethod: PaymentMethod;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});
  const errors = new Map(Object.entries(state.fieldErrors ?? {}));
  const err = (path: string) => errors.get(`shipping.${path}`) ?? errors.get(path);

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="idem" value={idempotencyKey} />
      <input type="hidden" name="district" value={district ?? ''} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      {state.error && <Alert>{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Full name" error={err('fullName')}>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            defaultValue={defaults.fullName}
            invalid={!!err('fullName')}
            required
          />
        </Field>
        <Field
          id="phone"
          label="Mobile number"
          hint="We call this number to confirm your order"
          error={err('phone')}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="077 123 4567"
            defaultValue={defaults.phone}
            invalid={!!err('phone')}
            hasHint
            required
          />
        </Field>
        <Field
          id="email"
          label="Email"
          hint="For your order receipt"
          error={err('email')}
          optional
          className="sm:col-span-2"
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaults.email}
            invalid={!!err('email')}
            hasHint
          />
        </Field>
        <Field id="line1" label="Address" error={err('line1')} className="sm:col-span-2">
          <Input
            id="line1"
            name="line1"
            autoComplete="address-line1"
            invalid={!!err('line1')}
            required
          />
        </Field>
        <Field
          id="line2"
          label="Address line 2"
          error={err('line2')}
          optional
          className="sm:col-span-2"
        >
          <Input id="line2" name="line2" autoComplete="address-line2" />
        </Field>
        <Field id="city" label="City / town" error={err('city')}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            invalid={!!err('city')}
            required
          />
        </Field>
        <Field id="postalCode" label="Postal code" error={err('postalCode')} optional>
          <Input
            id="postalCode"
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            invalid={!!err('postalCode')}
          />
        </Field>
        <p className="text-sm sm:col-span-2">
          District: <span className="font-medium">{districtName ?? 'not chosen yet'}</span>
        </p>
        <Field
          id="notes"
          label="Delivery notes"
          hint="Landmarks, best time to call…"
          error={err('notes')}
          optional
          className="sm:col-span-2"
        >
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </div>

      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-1 size-5 shrink-0 accent-primary"
        />
        <span>
          I agree to the{' '}
          <a
            href="/info/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            Terms and Conditions
          </a>{' '}
          and the{' '}
          <a
            href="/info/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={disabled || pending}>
        {pending
          ? 'Placing your order…'
          : paymentMethod === 'BANK_TRANSFER'
            ? 'Place order (bank transfer)'
            : 'Place order (cash on delivery)'}
      </Button>
      <p className="text-xs text-muted">
        {paymentMethod === 'BANK_TRANSFER'
          ? 'After placing your order you transfer the total to our bank account and upload your payment slip. We confirm your order once we have checked it.'
          : 'You pay in cash when the parcel arrives. We will call you to confirm before dispatch.'}
      </p>
    </form>
  );
}
