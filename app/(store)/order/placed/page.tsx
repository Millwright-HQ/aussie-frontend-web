import type { OrderView } from '@aussie/shared-types';
import { buttonVariants } from '@aussie/ui';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LAST_ORDER_COOKIE } from '@/lib/order-cookie';
import { publicPost } from '@/lib/orders';
import { OrderSummary } from '../../_components/order-summary';

export const metadata = { title: 'Order placed' };

export default async function OrderPlacedPage() {
  const raw = (await cookies()).get(LAST_ORDER_COOKIE)?.value;
  let ref: { n: string; p: string } | undefined;
  try {
    ref = raw ? (JSON.parse(raw) as { n: string; p: string }) : undefined;
  } catch {
    ref = undefined;
  }
  if (!ref) redirect('/track');
  const res = await publicPost<OrderView>('/v1/orders/track', { orderNumber: ref.n, phone: ref.p });
  if (!res.ok) redirect('/track');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="text-h1">Thank you! Your order is placed.</h1>
      <p className="mt-2 text-muted">
        Keep your order number to track it any time.{' '}
        {res.data.paymentMethod === 'BANK_TRANSFER'
          ? 'Transfer the total and upload your payment slip below; we confirm your order once we have checked it.'
          : 'We will call you to confirm before dispatch.'}
        {res.data.email && ` A receipt is on its way to ${res.data.email}.`}
      </p>
      <div className="mt-8 rounded-md border border-border bg-surface p-6">
        <OrderSummary order={res.data} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className={buttonVariants({ variant: 'outline' })}>
          Continue shopping
        </Link>
        <Link href="/track" className={buttonVariants({ variant: 'ghost' })}>
          Track another order
        </Link>
      </div>
    </div>
  );
}
