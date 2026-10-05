import { buttonVariants, Button, formatLkr } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import Image from 'next/image';
import Link from 'next/link';
import { getCart } from '@/lib/cart';
import { describeQuote, getDistricts, getQuote } from '@/lib/delivery';
import { availableUnits, getAvailability } from '@/lib/inventory';
import { imageUrl } from '@/lib/media';
import { bagHasUnavailable, bagSubtotal, loadBag } from '@/lib/orders';
import { QuantityInput } from '../_components/quantity-input';
import { removeFromBagAction, setQuantityAction } from './actions';

export const metadata = { title: 'Your bag' };

const districtCode = (v: string | string[] | undefined) => {
  const code = Array.isArray(v) ? v[0] : v;
  return DISTRICTS.find((d) => d.code === code)?.code;
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const district = districtCode((await searchParams).district);
  const [bag, districts] = await Promise.all([loadBag(await getCart()), getDistricts()]);
  // Units in stock per variant, so quantities can never go past what exists.
  const stockByProduct = new Map(
    await Promise.all(
      [...new Set(bag.map((l) => l.productId))].map(
        async (id) => [id, await getAvailability(id, { fresh: true })] as const,
      ),
    ),
  );
  const unitsOf = (l: { productId: string; variantId: string }) =>
    availableUnits(stockByProduct.get(l.productId)?.[l.variantId]);
  const subtotal = bagSubtotal(bag);
  const blocked = bagHasUnavailable(bag);

  // Delivery fee preview (checkout works it out again from the same data).
  const quote =
    district && bag.length > 0 && !blocked
      ? await getQuote({
          district,
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

  if (bag.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <h1 className="text-h1">Your bag is empty</h1>
        <p className="mt-2 text-muted">Find something you like and add it to your bag.</p>
        <Link href="/shop" className={`${buttonVariants({ size: 'lg' })} mt-6 inline-flex`}>
          Shop all products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 lg:px-8">
      <h1 className="text-h1">Your bag</h1>
      <div className="mt-8 gap-10 lg:flex">
        <ul className="min-w-0 flex-1 divide-y divide-border border-y border-border">
          {bag.map((l) => {
            const s = l.snapshot;
            return (
              <li key={l.variantId} className="flex gap-4 py-5">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                  {s.imageBase && (
                    <Image
                      src={imageUrl(s.imageBase)}
                      alt={s.imageAlt ?? ''}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {s.available ? (
                    <>
                      <Link href={`/p/${s.slug}`} className="font-medium hover:underline">
                        {s.productName}
                      </Link>
                      {s.label && <p className="text-sm text-muted">{s.label}</p>}
                      <p className="mt-1 text-sm tabular">{formatLkr(s.priceCents ?? 0)} each</p>
                    </>
                  ) : (
                    <p className="font-medium text-danger">
                      This item is no longer available. Please remove it to continue.
                    </p>
                  )}
                  {s.available && unitsOf(l) !== undefined && l.qty > (unitsOf(l) ?? 0) && (
                    <p className="mt-1 text-sm text-danger">
                      Only {unitsOf(l)} in stock. Please lower the quantity to continue.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {s.available && (
                      <form action={setQuantityAction} className="flex items-center gap-2">
                        <input type="hidden" name="variantId" value={l.variantId} />
                        <QuantityInput
                          id={`qty-${l.variantId}`}
                          defaultValue={l.qty}
                          max={unitsOf(l)}
                          compact
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Update
                        </Button>
                      </form>
                    )}
                    <form action={removeFromBagAction}>
                      <input type="hidden" name="variantId" value={l.variantId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
                {s.available && (
                  <p className="font-medium tabular">{formatLkr((s.priceCents ?? 0) * l.qty)}</p>
                )}
              </li>
            );
          })}
        </ul>

        <aside className="mt-8 w-full shrink-0 lg:mt-0 lg:w-80">
          <div className="rounded-md border border-border bg-surface p-5">
            <h2 className="text-h3">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatLkr(subtotal)}</dd>
              </div>
            </dl>

            <form method="get" className="mt-4 space-y-2">
              <label htmlFor="district" className="block text-sm font-medium">
                Delivery district
              </label>
              <div className="flex gap-2">
                <select
                  id="district"
                  name="district"
                  defaultValue={district ?? ''}
                  className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-2"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Show fee
                </Button>
              </div>
            </form>

            {quote && !quote.ok && <p className="mt-3 text-sm text-danger">{quote.message}</p>}
            {quote?.ok && (
              <>
                <p className="mt-3 text-sm text-muted">{describeQuote(quote.quote)}</p>
                <p className="mt-3 flex justify-between border-t border-border pt-3 font-medium">
                  <span>Total (cash on delivery)</span>
                  <span className="tabular">{formatLkr(subtotal + quote.quote.totalFeeCents)}</span>
                </p>
              </>
            )}
            {!quote && (
              <p className="mt-3 text-sm text-muted">Delivery fee is added at checkout.</p>
            )}

            {blocked ? (
              <p className="mt-4 text-sm text-danger">Remove unavailable items to check out.</p>
            ) : (
              <Link
                href={district ? `/checkout/start?district=${district}` : '/checkout/start'}
                className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}
              >
                Check out
              </Link>
            )}
            <p className="mt-3 text-xs text-muted">Pay in cash when your order arrives.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
