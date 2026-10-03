import { ulidSchema } from '@aussie/validation';
import { api, ApiError } from '@/lib/api';

/**
 * Opens a customer's payment slip. Links to slips are short-lived, so this makes a fresh one on
 * every click and redirects to it. The API checks the `order:payment` permission.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ulidSchema.safeParse(id).success) return new Response('Not found', { status: 404 });
  try {
    const { url } = await api<{ url: string }>(
      'admin',
      `/v1/orders/admin/orders/${id}/payment-proof`,
    );
    return Response.redirect(url, 302);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return new Response(err.status === 403 ? 'Not allowed' : 'No payment slip uploaded', {
        status: err.status,
      });
    }
    throw err;
  }
}
