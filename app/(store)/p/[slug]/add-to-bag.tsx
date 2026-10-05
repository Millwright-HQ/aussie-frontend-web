'use client';

import { Button } from '@aussie/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { addToBagAction, type BagState } from '../../cart/actions';
import { QuantityInput } from '../../_components/quantity-input';

/** Quantity + "Add to bag". Remounted with the selected variant, so each variant starts clean. */
export function AddToBag({
  productId,
  variantId,
  soldOut,
  maxQty,
  className,
}: {
  productId: string;
  variantId: string;
  soldOut: boolean;
  /** Units in stock (undefined = unknown). */
  maxQty?: number | undefined;
  className?: string;
}) {
  const [state, action, pending] = useActionState<BagState, FormData>(addToBagAction, {});
  return (
    <form action={action} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={variantId} />
      <div className="flex flex-wrap items-center gap-3">
        <QuantityInput key={variantId} id={`qty-${variantId}`} max={maxQty} disabled={soldOut} />
        <Button type="submit" size="lg" disabled={soldOut || pending}>
          {soldOut ? 'Sold out' : pending ? 'Adding…' : 'Add to bag'}
        </Button>
      </div>
      <p className="mt-2 min-h-5 text-sm" aria-live="polite">
        {state.ok && (
          <span className="text-success">
            {state.ok}{' '}
            <Link href="/cart" className="underline">
              View bag
            </Link>
          </span>
        )}
        {state.error && <span className="text-danger">{state.error}</span>}
      </p>
    </form>
  );
}
