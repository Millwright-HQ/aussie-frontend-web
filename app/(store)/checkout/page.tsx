import type { PaymentMethod } from '@aussie/shared-types';
import { Button, formatLkr } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getSession } from '@/lib/auth/session';
import { getCart } from '@/lib/cart';
import { describeQuote, getQuote } from '@/lib/delivery';
import { bagHasUnavailable, bagSubtotal, getBankDetails, loadBag } from '@/lib/orders';
import { CheckoutForm, type CheckoutDefaults } from './checkout-form';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.district;
  const district = DISTRICTS.find((d) => d.code === (Array.isArray(raw) ? raw[0] : raw));
  // Bank transfer is offered only once an admin has entered the store's bank details.
  const bank = await getBankDetails();
  const paymentMethod: PaymentMethod =
    bank && params.pay === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'COD';
  const byTransfer = paymentMethod === 'BANK_TRANSFER';
  const bag = await loadBag(await getCart());
  if (bag.length === 0 || bagHasUnavailable(bag)) redirect('/cart');
  const subtotal = bagSubtotal(bag);

  const quote = district
    ? await getQuote({
        district: district.code,
        subtotalCents: subtotal,
        items: bag.map((l) => ({
          weightG: l.snapshot.weightG ?? 1,
          qty: l.qty,
          ...(l.snapshot.lengthCm && l.snapshot.widthCm && l.snapshot.heightCm
            ? {
                lengthCm: l.snapshot.lengthCm,
                widthCm: l.snapshot.widthCm,
                heightCm: l.snapshot.heightCm,
              }
            : {}),
        })),
      })
    : undefined;

  // Signed-in customers get their details filled in.
  const defaults: CheckoutDefaults = { fullName: '', phone: '', email: '' };
  if (await getSession('customer')) {
    const me = await api<{ name?: string; phone?: string | null; email?: string }>(
      'customer',
      '/v1/identity/me',
    ).catch(() => undefined);
    defaults.fullName = me?.name ?? '';
    defaults.phone = me?.phone ?? '';
    defaults.email = me?.email ?? '';
  }

  const canOrder = Boolean(quote?.ok);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 lg:px-8">
      <h1 className="text-h1">Checkout</h1>
      <div className="mt-8 gap-10 lg:flex">
        <div className="min-w-0 flex-1 space-y-8">
          <section aria-labelledby="where">
            <h2 id="where" className="text-h3">
              1. Where should we deliver?
            </h2>
            <form method="get" className="mt-3 flex max-w-md gap-2">
              <input type="hidden" name="pay" value={paymentMethod} />
              <label htmlFor="district" className="sr-only">
                District
              </label>
              <select
                id="district"
                name="district"
                defaultValue={district?.code ?? ''}
                className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-2"
              >
                <option value="" disabled>
                  Choose your district…
                </option>
                {DISTRICTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Update fee
              </Button>
            </form>
            {quote && !quote.ok && <p className="mt-3 text-sm text-danger">{quote.message}</p>}
          </section>

          {bank && (
            <section aria-labelledby="payment">
              <h2 id="payment" className="text-h3">
                2. How would you like to pay?
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    ['COD', 'Cash on delivery'],
                    ['BANK_TRANSFER', 'Bank transfer'],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    key={value}
                    href={`/checkout?${new URLSearchParams({
                      ...(district ? { district: district.code } : {}),
                      pay: value,
                    })}`}
                    aria-current={paymentMethod === value ? 'true' : undefined}
                    className="min-h-11 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm font-medium aria-[current=true]:border-primary aria-[current=true]:bg-surface-muted aria-[current=true]:text-primary"
                  >
                    {label}
                  </Link>
                ))}
              </div>
              {byTransfer && (
                <p className="mt-3 text-sm text-muted">
                  No cash-handling fee. You will see our bank details after placing the order, then
                  upload your payment slip.
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="details">
            <h2 id="details" className="text-h3">
              {bank ? '3' : '2'}. Your details
            </h2>
            <div className="mt-3">
              <CheckoutForm
                district={district?.code}
                districtName={district?.name}
                idempotencyKey={randomUUID()}
                defaults={defaults}
                disabled={!canOrder}
                paymentMethod={paymentMethod}
              />
              {!canOrder && !quote && (
                <p className="mt-3 text-sm text-muted">Choose your district above to continue.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="mt-8 w-full shrink-0 lg:mt-0 lg:w-80">
          <div className="rounded-md border border-border bg-surface p-5">
            <h2 className="text-h3">Your order</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {bag.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-3">
                  <span>
                    {l.snapshot.productName}
                    {l.snapshot.label && (
                      <span className="text-muted"> · {l.snapshot.label}</span>
                    )}{' '}
                    × {l.qty}
                  </span>
                  <span className="tabular">{formatLkr((l.snapshot.priceCents ?? 0) * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatLkr(subtotal)}</dd>
              </div>
              {quote?.ok && (
                <>
                  <div className="flex justify-between">
                    <dt>Delivery</dt>
                    <dd className="tabular">
                      {quote.quote.freeDelivery ? 'Free' : formatLkr(quote.quote.deliveryFeeCents)}
                    </dd>
                  </div>
                  {!byTransfer && quote.quote.codFeeCents > 0 && (
                    <div className="flex justify-between">
                      <dt>Cash on delivery fee</dt>
                      <dd className="tabular">{formatLkr(quote.quote.codFeeCents)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                    <dt>Total</dt>
                    <dd className="tabular">
                      {formatLkr(
                        subtotal +
                          quote.quote.deliveryFeeCents +
                          (byTransfer ? 0 : quote.quote.codFeeCents),
                      )}
                    </dd>
                  </div>
                  <p className="text-xs text-muted">
                    {describeQuote(byTransfer ? { ...quote.quote, codFeeCents: 0 } : quote.quote)}
                  </p>
                </>
              )}
            </dl>
            <Link
              href="/cart"
              className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Edit bag
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
