import { notFound, redirect } from 'next/navigation';
import { ulidSchema } from '@aussie/validation';
import { requirePermission } from '@/lib/admin';
import { ApiError } from '@/lib/api';
import { getStock } from '../stock';

export const metadata = { title: 'Stock' };

/**
 * Old and short links (`/admin/products/stock/<variant>`) find the variant's product and go to
 * its page: stock now lives inside each product.
 */
export default async function StockRedirect({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  await requirePermission('inventory:read');
  const { variantId } = await params;
  if (!ulidSchema.safeParse(variantId).success) notFound();
  const stock = await getStock(variantId).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  redirect(`/admin/products/${stock.productId}/stock/${variantId}`);
}
