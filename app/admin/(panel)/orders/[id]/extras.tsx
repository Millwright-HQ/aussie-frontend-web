import type { Order } from '@aussie/shared-types';
import { buttonVariants, Field, Input, Textarea } from '@/app/admin/_ui';
import { ActionForm } from '../../action-form';
import { addNoteAction, editShippingAction, refundAction } from '../actions';

/** Phone and WhatsApp links: they only open the customer's own apps, nothing is stored. */
export function ContactButtons({
  order,
  storeName,
}: {
  order: Pick<Order, 'orderNumber'> & { shipping: Pick<Order['shipping'], 'phone' | 'fullName'> };
  storeName: string;
}) {
  const { phone, fullName } = order.shipping;
  const digits = phone.replace(/\D/g, '');
  const message = `Hello ${fullName}, this is ${storeName} about your order ${order.orderNumber}.`;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a href={`tel:${phone}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Call
      </a>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        WhatsApp
      </a>
    </div>
  );
}

/** A staff-only note on the order's history; nothing else changes. */
export function NoteForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={addNoteAction.bind(null, orderId)} submitLabel="Add note" size="sm">
      <Field id="staff-note" label="Staff note" hint="Only staff see this">
        <Input id="staff-note" name="note" maxLength={300} required hasHint />
      </Field>
    </ActionForm>
  );
}

/** Fix the name, phone or address before the parcel leaves. The district (and so the fee) is fixed. */
export function ShippingForm({ order }: { order: Order }) {
  const s = order.shipping;
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-medium text-primary">Edit delivery details</summary>
      <ActionForm
        action={editShippingAction.bind(null, order.id)}
        submitLabel="Save details"
        size="sm"
        className="mt-3"
      >
        <div className="grid gap-3">
          <Field id="ship-name" label="Name">
            <Input id="ship-name" name="fullName" defaultValue={s.fullName} required />
          </Field>
          <Field
            id="ship-phone"
            label="Mobile number"
            hint="The customer tracks the order with this number"
          >
            <Input
              id="ship-phone"
              name="phone"
              type="tel"
              defaultValue={s.phone}
              required
              hasHint
            />
          </Field>
          <Field id="ship-line1" label="Address">
            <Input id="ship-line1" name="line1" defaultValue={s.line1} required />
          </Field>
          <Field id="ship-line2" label="Address line 2" optional>
            <Input id="ship-line2" name="line2" defaultValue={s.line2} />
          </Field>
          <Field id="ship-city" label="City">
            <Input id="ship-city" name="city" defaultValue={s.city} required />
          </Field>
          <Field id="ship-postal" label="Postal code" optional>
            <Input id="ship-postal" name="postalCode" defaultValue={s.postalCode} />
          </Field>
          <Field id="ship-notes" label="Delivery notes" optional>
            <Textarea id="ship-notes" name="notes" rows={2} defaultValue={s.notes} />
          </Field>
          <p className="text-xs text-muted">
            The district cannot change here because it sets the delivery fee. To change it, cancel
            this order and place a new one.
          </p>
        </div>
      </ActionForm>
    </details>
  );
}

/** Record that the customer was paid back after a cancelled or returned bank-transfer order. */
export function RefundForm({ orderId, totalCents }: { orderId: string; totalCents: number }) {
  return (
    <ActionForm
      action={refundAction.bind(null, orderId)}
      submitLabel="Mark refund as paid"
      size="sm"
    >
      <p className="text-sm">
        The customer paid by bank transfer, so{' '}
        <span className="font-medium">
          Rs {(totalCents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>{' '}
        is owed back. Pay it from your bank account, then record it here.
      </p>
      <Field id="refund-note" label="Reference" hint="For example the transfer reference" optional>
        <Input id="refund-note" name="note" maxLength={300} hasHint />
      </Field>
    </ActionForm>
  );
}
