'use server';

import { MAX_QTY_PER_LINE, ulidSchema } from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { getCart, saveCart, withLine } from '@/lib/cart';
import { availableUnits, getAvailability } from '@/lib/inventory';
import { lookupBag } from '@/lib/orders';

export interface BagState {
  ok?: string;
  error?: string;
}

/** Adds one variant to the bag after checking with the catalog that it is on sale. */
export async function addToBagAction(_prev: BagState, form: FormData): Promise<BagState> {
  const productId = ulidSchema.safeParse(form.get('productId'));
  const variantId = ulidSchema.safeParse(form.get('variantId'));
  const qty = Number(form.get('qty') ?? 1);
  if (
    !productId.success ||
    !variantId.success ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > MAX_QTY_PER_LINE
  ) {
    return { error: 'Could not add that item.' };
  }
  const [snapshot] = await lookupBag([
    { productId: productId.data, variantId: variantId.data, qty },
  ]);
  if (!snapshot?.available) return { error: 'Sorry, this item is not available right now.' };
  // Never more than what is in stock, counting what is already in the bag.
  const lines = await getCart();
  const inBag = lines.find((l) => l.variantId === variantId.data)?.qty ?? 0;
  const units = availableUnits(
    (await getAvailability(productId.data, { fresh: true }))?.[variantId.data],
  );
  if (units !== undefined && inBag + qty > units) {
    if (units === 0) return { error: 'Sorry, this item just sold out.' };
    return {
      error:
        inBag > 0
          ? `Only ${units} in stock, and ${inBag} ${inBag === 1 ? 'is' : 'are'} already in your bag.`
          : `Only ${units} in stock.`,
    };
  }
  const next = withLine(lines, {
    productId: productId.data,
    variantId: variantId.data,
    qty,
  });
  if (!next) return { error: 'Your bag is full. Please check out before adding more.' };
  await saveCart(next);
  revalidatePath('/', 'layout'); // the header badge
  return { ok: 'Added to your bag.' };
}

export async function setQuantityAction(form: FormData): Promise<void> {
  const variantId = ulidSchema.safeParse(form.get('variantId'));
  const qty = Number(form.get('qty'));
  if (!variantId.success || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return;
  const lines = await getCart();
  const line = lines.find((l) => l.variantId === variantId.data);
  if (!line) return;
  const units = availableUnits(
    (await getAvailability(line.productId, { fresh: true }))?.[line.variantId],
  );
  const capped = units === undefined ? qty : Math.min(qty, Math.max(1, units));
  await saveCart(lines.map((l) => (l.variantId === variantId.data ? { ...l, qty: capped } : l)));
  revalidatePath('/', 'layout');
}

export async function removeFromBagAction(form: FormData): Promise<void> {
  const variantId = ulidSchema.safeParse(form.get('variantId'));
  if (!variantId.success) return;
  await saveCart((await getCart()).filter((l) => l.variantId !== variantId.data));
  revalidatePath('/', 'layout');
}
