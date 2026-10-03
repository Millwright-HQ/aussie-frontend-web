import type { OrderView } from '@aussie/shared-types';
import { Card } from '@aussie/ui';
import { ulidSchema } from '@aussie/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { requireCustomerSession } from '@/lib/auth/session';
import { OrderSummary } from '../../../_components/order-summary';
import { AccountLayout } from '../../account-nav';
import { CancelOrder } from '../cancel-button';

export const metadata = { title: 'Order' };

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ulidSchema.safeParse(id).success) notFound();
  await requireCustomerSession(`/account/orders/${id}`);
  const order = await api<OrderView>('customer', `/v1/orders/my/${id}`).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!order) notFound();

  return (
    <AccountLayout current="/account/orders">
      <Link href="/account/orders" className="text-sm text-muted hover:text-text">
        ← Orders
      </Link>
      <Card className="mt-3">
        <OrderSummary order={order} />
        {order.status === 'PENDING' && (
          <div className="mt-6 border-t border-border pt-6">
            <CancelOrder orderId={order.id} />
          </div>
        )}
      </Card>
    </AccountLayout>
  );
}
