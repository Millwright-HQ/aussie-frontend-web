'use client';

import type { BankDetails, PaymentMethod } from '@aussie/shared-types';
import { Alert, Button, Field, formatLkr, Input, Select, Textarea } from '@aussie/ui';
import { MAX_PROOF_BYTES, PROOF_CONTENT_TYPES } from '@aussie/validation';
import { Banknote, Check, Clock, Minus, Plus, Trash2, Upload, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import {
  type CheckoutState,
  changeQtyAction,
  placeOrderAction,
  quoteAction,
  type QuoteView,
  requestSlipAction,
} from './actions';

export interface CheckoutDefaults {
  fullName: string;
  phone: string;
  email: string;
}

export interface CheckoutLine {
  variantId: string;
  name: string;
  label?: string | undefined;
  qty: number;
  unitCents: number;
  /** Most the shopper can have of this line: what they hold plus what is still in stock. */
  max: number;
}

export interface DistrictChoice {
  code: string;
  name: string;
  province: string;
  feeCents?: number | undefined;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The held stock's countdown. At zero the page offers to start again (the stock was given back). */
function HoldTimer({
  expiresAt,
  onExpired,
}: {
  expiresAt: string;
  onExpired: (expired: boolean) => void;
}) {
  const [left, setLeft] = useState(() => Date.parse(expiresAt) - Date.now());
  useEffect(() => {
    const tick = () => {
      const ms = Date.parse(expiresAt) - Date.now();
      setLeft(ms);
      onExpired(ms <= 0);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpired]);
  return left > 0 ? (
    <p
      className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm"
      role="timer"
      aria-live="off"
    >
      <Clock aria-hidden size={15} />
      <span>
        Your items are held for <span className="font-semibold tabular">{mmss(left)}</span>
      </span>
    </p>
  ) : (
    <Alert tone="warning">
      Your time ran out and the items were put back on sale.{' '}
      <Link href="/checkout/start" className="font-medium underline">
        Start the checkout again
      </Link>
    </Alert>
  );
}

/** Pending in-site-leave release, cancelled when the form mounts again right away. */
let leaveTimer: ReturnType<typeof setTimeout> | undefined;

export function CheckoutForm({
  lines,
  subtotalCents,
  districts,
  initialDistrict,
  bank,
  expiresAt,
  defaults,
  idempotencyKey,
}: {
  lines: CheckoutLine[];
  subtotalCents: number;
  districts: DistrictChoice[];
  initialDistrict: string;
  bank: Omit<BankDetails, 'updatedAt'> | null;
  expiresAt: string;
  defaults: CheckoutDefaults;
  idempotencyKey: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});
  const errors = new Map(Object.entries(state.fieldErrors ?? {}));
  const err = (path: string) => errors.get(`shipping.${path}`) ?? errors.get(path);

  const [district, setDistrict] = useState(initialDistrict);
  const [quote, setQuote] = useState<QuoteView>();
  const [payment, setPayment] = useState<PaymentMethod>('COD');
  const [expired, setExpired] = useState(false);
  const [bagError, setBagError] = useState<{ id: string; text: string }>();
  const [editing, startEdit] = useTransition();
  const [slip, setSlip] = useState<{ uploadId: string; name: string }>();
  const [slipBusy, setSlipBusy] = useState(false);
  const [slipError, setSlipError] = useState<string>();
  const file = useRef<HTMLInputElement>(null);

  // Leaving without ordering gives the held stock back at once (the 30-minute sweep is the fallback).
  // Not while the order is being placed: that order needs the hold.
  const placing = useRef(false);
  placing.current = pending;
  useEffect(() => {
    const leave = () => {
      if (!placing.current) navigator.sendBeacon('/checkout/leave');
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      // Moving to another page inside the site (no pagehide). Deferred a tick so a dev-mode
      // remount does not release the hold it is about to use again.
      leaveTimer = setTimeout(leave, 0);
    };
  }, []);
  useEffect(() => {
    clearTimeout(leaveTimer);
  }, []);

  const byTransfer = payment === 'BANK_TRANSFER';

  // The fee follows the district and the bag.
  useEffect(() => {
    if (!district) {
      setQuote(undefined);
      return;
    }
    let live = true;
    setQuote(undefined);
    void quoteAction(district).then((q) => live && setQuote(q));
    return () => {
      live = false;
    };
  }, [district, subtotalCents]);

  const delivery = quote?.ok ? quote.deliveryCents : 0;
  const cod = quote?.ok && !byTransfer ? quote.codCents : 0;
  const total = subtotalCents + delivery + cod;
  const needsSlip = byTransfer && !slip;
  const canOrder = Boolean(quote?.ok) && !expired && !needsSlip;

  function edit(variantId: string, qty: number) {
    setBagError(undefined);
    startEdit(async () => {
      const r = await changeQtyAction(variantId, qty);
      if (!r.ok) setBagError({ id: variantId, text: r.error });
      else if (r.empty) router.push('/cart');
      else router.refresh();
    });
  }

  async function upload(chosen: File) {
    setSlipError(undefined);
    if (!(PROOF_CONTENT_TYPES as readonly string[]).includes(chosen.type)) {
      setSlipError('Upload a JPG, PNG, WebP or PDF.');
      return;
    }
    if (chosen.size > MAX_PROOF_BYTES) {
      setSlipError('The slip must be 5 MB or smaller.');
      return;
    }
    setSlipBusy(true);
    try {
      const ticket = await requestSlipAction(chosen.type, chosen.size);
      if ('error' in ticket) {
        setSlipError(ticket.error);
        return;
      }
      const body = new FormData();
      for (const [k, v] of Object.entries(ticket.upload.fields)) body.append(k, v);
      body.append('file', chosen);
      const res = await fetch(ticket.upload.url, { method: 'POST', body });
      if (!res.ok) {
        setSlipError('The upload failed. Please try again.');
        return;
      }
      setSlip({ uploadId: ticket.uploadId, name: chosen.name });
    } catch {
      setSlipError('The upload failed. Please try again.');
    } finally {
      setSlipBusy(false);
    }
  }

  return (
    <div className="mt-8 gap-10 lg:flex">
      <form action={action} noValidate className="min-w-0 flex-1 space-y-8">
        <input type="hidden" name="idem" value={idempotencyKey} />
        <input type="hidden" name="district" value={district} />
        <input type="hidden" name="paymentMethod" value={payment} />
        <input type="hidden" name="proofUploadId" value={slip?.uploadId ?? ''} />
        {state.error && (
          <Alert>
            {state.error}{' '}
            {state.restart && (
              <Link href="/checkout/start" className="font-medium underline">
                Start the checkout again
              </Link>
            )}
          </Alert>
        )}

        {bank && (
          <section aria-labelledby="payment">
            <h2 id="payment" className="text-h3">
              1. How would you like to pay?
            </h2>
            <div
              className="mt-3 grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-labelledby="payment"
            >
              {(
                [
                  ['COD', 'Cash on delivery', 'Pay in cash.', Wallet],
                  [
                    'BANK_TRANSFER',
                    'Bank transfer',
                    'Pay now, upload your slip here. No cash fee.',
                    Banknote,
                  ],
                ] as const
              ).map(([value, label, hint, Icon]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="pay"
                    value={value}
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon aria-hidden size={16} /> {label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {byTransfer && (
              <div className="mt-4 space-y-4 rounded-md border border-border bg-surface p-5">
                <div>
                  <p className="text-sm font-medium">Transfer {formatLkr(total)} to this account</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[130px_1fr]">
                    <dt className="text-muted">Account name</dt>
                    <dd className="font-medium">{bank.accountName}</dd>
                    <dt className="text-muted">Bank</dt>
                    <dd>
                      {bank.bankName}, {bank.branch}
                    </dd>
                    <dt className="text-muted">Account number</dt>
                    <dd className="font-medium tabular select-all">{bank.accountNumber}</dd>
                  </dl>
                  {bank.instructions && (
                    <p className="mt-3 text-sm text-muted">{bank.instructions}</p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium">Then upload your payment slip</p>
                  <p className="mt-1 text-xs text-muted">
                    A photo or screenshot that shows the amount, JPG, PNG, WebP or PDF up to 5 MB.
                    We check it before we start on your order.
                  </p>
                  <input
                    ref={file}
                    type="file"
                    accept={PROOF_CONTENT_TYPES.join(',')}
                    className="sr-only"
                    aria-label="Choose your payment slip"
                    onChange={(e) => {
                      const chosen = e.target.files?.[0];
                      e.target.value = '';
                      if (chosen) void upload(chosen);
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={slip ? 'outline' : 'primary'}
                      disabled={slipBusy || expired}
                      onClick={() => file.current?.click()}
                    >
                      <Upload aria-hidden size={16} />
                      {slipBusy
                        ? 'Uploading…'
                        : slip
                          ? 'Choose a different slip'
                          : 'Upload payment slip'}
                    </Button>
                    {slip && (
                      <span className="flex items-center gap-1.5 text-sm text-success">
                        <Check aria-hidden size={15} /> {slip.name}
                      </span>
                    )}
                  </div>
                  {slipError && <p className="mt-2 text-sm text-danger">{slipError}</p>}
                </div>
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="details">
          <h2 id="details" className="text-h3">
            {bank ? '2' : '1'}. Your details and delivery address
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <label htmlFor="district-pick" className="mb-1.5 block text-sm font-medium">
                District
              </label>
              <Select
                id="district-pick"
                name="district-pick"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="" disabled>
                  Choose your district…
                </option>
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </Select>
              {district && quote && !quote.ok && (
                <p className="mt-2 text-sm text-danger">{quote.message}</p>
              )}
              {!district && (
                <p className="mt-2 text-sm text-muted">
                  Choose your district to see the delivery fee.
                </p>
              )}
            </div>
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
            <Field
              id="instructions"
              label="Order instructions"
              hint="Anything we should know about this order, e.g. gift wrap or call before delivery"
              error={err('instructions')}
              optional
              className="sm:col-span-2"
            >
              <Textarea id="instructions" name="instructions" rows={3} maxLength={500} />
            </Field>
          </div>

          <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
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

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full sm:w-auto"
            disabled={!canOrder || pending}
          >
            {pending
              ? 'Completing your order…'
              : byTransfer
                ? needsSlip
                  ? 'Upload your slip to complete the order'
                  : 'Complete order'
                : 'Complete order (cash on delivery)'}
          </Button>
          <p className="mt-3 text-xs text-muted">
            {byTransfer
              ? 'We check your payment slip first. If it is accepted we start on your order; if not, we tell you why by email or SMS so you can send another.'
              : 'You pay in cash when the parcel arrives. We will call you to confirm before dispatch.'}
          </p>
        </section>
      </form>

      <aside className="mt-8 w-full shrink-0 space-y-4 lg:mt-0 lg:w-80">
        <HoldTimer expiresAt={expiresAt} onExpired={setExpired} />
        <div className="rounded-md border border-border bg-surface p-5">
          <h2 className="text-h3">Your order</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {lines.map((l) => (
              <li key={l.variantId}>
                <div className="flex justify-between gap-3">
                  <span>
                    {l.name}
                    {l.label && <span className="text-muted"> · {l.label}</span>}
                  </span>
                  <span className="tabular">{formatLkr(l.unitCents * l.qty)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Fewer ${l.name}`}
                    disabled={editing || l.qty <= 1}
                    onClick={() => edit(l.variantId, l.qty - 1)}
                    className="inline-flex size-8 items-center justify-center rounded-sm border border-border hover:bg-surface-muted disabled:opacity-40"
                  >
                    <Minus aria-hidden size={14} />
                  </button>
                  <span className="w-8 text-center tabular" aria-live="polite">
                    {l.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`More ${l.name}`}
                    disabled={editing || l.qty >= l.max}
                    onClick={() => edit(l.variantId, l.qty + 1)}
                    className="inline-flex size-8 items-center justify-center rounded-sm border border-border hover:bg-surface-muted disabled:opacity-40"
                  >
                    <Plus aria-hidden size={14} />
                  </button>
                  {l.qty >= l.max && <span className="ml-1 text-xs text-muted">Max {l.max}</span>}
                  <button
                    type="button"
                    aria-label={`Remove ${l.name}`}
                    disabled={editing}
                    onClick={() => edit(l.variantId, 0)}
                    className="ml-auto inline-flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface-muted hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 aria-hidden size={14} />
                  </button>
                </div>
                {bagError?.id === l.variantId && (
                  <p className="mt-1 text-xs text-danger">{bagError.text}</p>
                )}
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular">{formatLkr(subtotalCents)}</dd>
            </div>
            {quote?.ok && (
              <>
                <div className="flex justify-between">
                  <dt>Delivery</dt>
                  <dd className="tabular">
                    {quote.freeDelivery ? 'Free' : formatLkr(quote.deliveryCents)}
                  </dd>
                </div>
                {!byTransfer && quote.codCents > 0 && (
                  <div className="flex justify-between">
                    <dt>Cash on delivery fee</dt>
                    <dd className="tabular">{formatLkr(quote.codCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                  <dt>Total</dt>
                  <dd className="tabular">{formatLkr(total)}</dd>
                </div>
                <p className="text-xs text-muted">{quote.note}</p>
              </>
            )}
            {!quote?.ok && (
              <p className="text-xs text-muted">
                Choose a district to see the delivery fee and total.
              </p>
            )}
          </dl>
          <Link
            href="/cart"
            className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to bag
          </Link>
        </div>
      </aside>
    </div>
  );
}
