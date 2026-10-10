import { Alert, Button } from '@aussie/ui';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getSession } from '@/lib/auth/session';
import { getCart } from '@/lib/cart';
import { holdBag, readHoldId } from '@/lib/checkout-hold';
import { getDistricts } from '@/lib/delivery';
import { availableUnits, getAvailability } from '@/lib/inventory';
import { bagHasUnavailable, bagSubtotal, getBankDetails, loadBag } from '@/lib/orders';
import { fixShortageAction } from './actions';
import { type CheckoutDefaults, CheckoutForm } from './checkout-form';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const lines = await getCart();
  const bag = await loadBag(lines);
  if (bag.length === 0 || bagHasUnavailable(bag)) redirect('/cart');

  // The stock is held while the customer is here (see lib/checkout-hold.ts). No hold yet, or a new
  // one was needed: the start route takes it and comes back.
  const district = pick(params.district);
  const startUrl = (adopt?: string) =>
    `/checkout/start?${new URLSearchParams({ ...(adopt ? { adopt } : {}), ...(district ? { district } : {}) })}`;
  const holdId = await readHoldId();
  // Try to hold even with no hold yet. If it works the start route stores it (pages cannot set
  // cookies); if nothing can be held (everything sold out) say so here, instead of bouncing between
  // this page and the start route forever, which showed a blank page.
  const outcome = await holdBag(lines, holdId);
  if (outcome.ok && outcome.hold.holdId !== holdId) redirect(startUrl(outcome.hold.holdId));
  if (!outcome.ok && outcome.hold && outcome.hold.holdId !== holdId)
    redirect(startUrl(outcome.hold.holdId));

  if (!outcome.ok) {
    // Someone else bought it, or the stock was lowered, since the customer chose these items.
    const byVariant = new Map(outcome.shortages.map((s) => [s.variantId, s]));
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="text-h1">Some items changed</h1>
        <Alert tone="warning" className="mt-6">
          {outcome.shortages.length > 0
            ? 'We do not have enough of these items for your order right now:'
            : outcome.message}
        </Alert>
        {outcome.shortages.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface text-sm">
            {bag
              .filter((l) => byVariant.has(l.variantId))
              .map((l) => {
                const s = byVariant.get(l.variantId);
                return (
                  <li key={l.variantId} className="flex justify-between gap-4 p-4">
                    <span>
                      {l.snapshot.productName}
                      {l.snapshot.label && (
                        <span className="text-muted"> · {l.snapshot.label}</span>
                      )}{' '}
                      × {l.qty}
                    </span>
                    <span className="text-danger">
                      {s?.available ? `only ${s.available} left` : 'sold out'}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {outcome.shortages.length > 0 && (
            <form action={fixShortageAction}>
              <Button type="submit">Update my bag to what is available</Button>
            </form>
          )}
          <Link
            href="/cart"
            className="inline-flex min-h-11 items-center rounded-sm border border-border px-5 text-sm font-medium hover:bg-surface-muted"
          >
            Back to bag
          </Link>
        </div>
      </div>
    );
  }

  const [districts, bank, ...availability] = await Promise.all([
    getDistricts(),
    getBankDetails(),
    ...[...new Set(bag.map((l) => l.productId))].map(
      async (id) => [id, await getAvailability(id, { fresh: true })] as const,
    ),
  ]);
  const stockOf = new Map(availability as [string, Awaited<ReturnType<typeof getAvailability>>][]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 lg:px-8">
      <h1 className="text-h1">Checkout</h1>
      <CheckoutForm
        lines={bag.map((l) => ({
          variantId: l.variantId,
          name: l.snapshot.productName ?? '',
          label: l.snapshot.label,
          qty: l.qty,
          unitCents: l.snapshot.priceCents ?? 0,
          // What they hold now plus whatever is still on the shelf.
          max: l.qty + (availableUnits(stockOf.get(l.productId)?.[l.variantId]) ?? 0),
        }))}
        subtotalCents={bagSubtotal(bag)}
        districts={districts}
        initialDistrict={districts.some((d) => d.code === district) ? (district ?? '') : ''}
        bank={bank}
        expiresAt={outcome.hold.expiresAt}
        defaults={defaults}
        idempotencyKey={randomUUID()}
      />
    </div>
  );
}
