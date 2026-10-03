import type { Order } from '@aussie/shared-types';
import { exportQuerySchema } from '@aussie/validation';
import { api, ApiError } from '@/lib/api';
import { ordersToCsv } from '@/lib/csv';

/** Downloads the orders placed between two dates as a CSV file. The API checks `order:read`. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = exportQuerySchema.safeParse({
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  });
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? 'Choose the dates', { status: 400 });
  }
  try {
    const { items } = await api<{ items: Order[] }>(
      'admin',
      `/v1/orders/admin/export?from=${parsed.data.from}&to=${parsed.data.to}`,
    );
    return new Response(`${String.fromCharCode(0xfeff)}${ordersToCsv(items)}`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="orders-${parsed.data.from}-to-${parsed.data.to}.csv"`,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return new Response('Not allowed', { status: 403 });
    }
    throw err;
  }
}
