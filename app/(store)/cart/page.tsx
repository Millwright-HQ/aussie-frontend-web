import { buttonVariants, Button, formatLkr } from '@aussie/ui';
import Image from 'next/image';
import Link from 'next/link';
import { getCart } from '@/lib/cart';
import { availableUnits, getAvailability } from '@/lib/inventory';
import { imageUrl } from '@/lib/media';
import { bagHasUnavailable, bagSubtotal, loadBag } from '@/lib/orders';
import { QuantityInput } from '../_components/quantity-input';
import { removeFromBagAction, setQuantityAction } from './actions';

export const metadata = { title: 'Your bag' };

export default async function CartPage() {
  const bag = await loadBag(await getCart());
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
                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-muted sm:size-24">
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
                  {s.available && (
                    <p className="mt-1 font-medium tabular sm:hidden">
                      {formatLkr((s.priceCents ?? 0) * l.qty)}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {s.available && (
                      <form action={setQuantityAction} className="flex flex-wrap items-center gap-2">
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
                  <p className="hidden font-medium tabular sm:block">
                    {formatLkr((s.priceCents ?? 0) * l.qty)}
                  </p>
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

            <p className="mt-3 text-sm text-muted">
              Delivery fee is worked out at checkout, once you enter your address.
            </p>

            {blocked ? (
              <p className="mt-4 text-sm text-danger">Remove unavailable items to check out.</p>
            ) : (
              <Link
                href="/checkout/start"
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
