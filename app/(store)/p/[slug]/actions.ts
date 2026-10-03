'use server';

import { districtSchema, ulidSchema } from '@aussie/validation';
import { getProduct } from '@/lib/catalog';
import { describeQuote, getQuote } from '@/lib/delivery';

export interface EstimateState {
  ok?: string;
  error?: string;
}

/**
 * "How much is delivery to my district?" for one unit of the chosen variant. Weight and size come
 * from the catalog on the server, never from the browser. The checkout (later milestone) works the
 * real fee out again from the whole order.
 */
export async function estimateDeliveryAction(
  slug: string,
  variantId: string,
  _prev: EstimateState,
  form: FormData,
): Promise<EstimateState> {
  const district = districtSchema.safeParse(form.get('district'));
  if (!district.success) return { error: 'Choose your district' };
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !ulidSchema.safeParse(variantId).success) {
    return { error: 'Could not find this product' };
  }
  const product = await getProduct(slug);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!variant) return { error: 'Could not find this product' };

  const result = await getQuote({
    district: district.data,
    subtotalCents: variant.priceCents,
    items: [
      {
        weightG: variant.weightG,
        qty: 1,
        ...(variant.lengthCm && variant.widthCm && variant.heightCm
          ? { lengthCm: variant.lengthCm, widthCm: variant.widthCm, heightCm: variant.heightCm }
          : {}),
      },
    ],
  });
  return result.ok ? { ok: describeQuote(result.quote) } : { error: result.message };
}
