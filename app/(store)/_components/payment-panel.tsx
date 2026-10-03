'use client';

import type { BankDetails, OrderView, PaymentStatus } from '@aussie/shared-types';
import { Alert } from '@aussie/ui';
import { MAX_PROOF_BYTES, PROOF_CONTENT_TYPES } from '@aussie/validation';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { bankDetailsAction, requestSlipUploadAction, submitSlipAction } from './payment-actions';

type Bank = Omit<BankDetails, 'updatedAt'>;

/**
 * Bank-transfer orders: where to send the money, and a form to upload the payment slip. Used on the
 * order-placed page, in tracking results and in the customer's account.
 */
export function PaymentPanel({ order }: { order: OrderView }) {
  const router = useRouter();
  const [bank, setBank] = useState<Bank | null | undefined>(undefined);
  const [status, setStatus] = useState<PaymentStatus | undefined>(order.paymentStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const byTransfer = order.paymentMethod === 'BANK_TRANSFER';
  useEffect(() => {
    if (!byTransfer) return;
    let live = true;
    void bankDetailsAction().then((b) => live && setBank(b));
    return () => {
      live = false;
    };
  }, [byTransfer]);

  if (!byTransfer) return null;
  if (order.status === 'CANCELLED' || order.status === 'RETURNED') return null;

  if (status === 'CONFIRMED' || order.status !== 'PENDING') {
    return (
      <Alert tone="success">
        Payment received by bank transfer. Thank you! Nothing more to pay on delivery.
      </Alert>
    );
  }

  async function upload(chosen: File) {
    setMessage(null);
    if (!(PROOF_CONTENT_TYPES as readonly string[]).includes(chosen.type)) {
      setMessage({ tone: 'danger', text: 'Upload a JPG, PNG, WebP or PDF.' });
      return;
    }
    if (chosen.size > MAX_PROOF_BYTES) {
      setMessage({ tone: 'danger', text: 'The slip must be 5 MB or smaller.' });
      return;
    }
    setBusy(true);
    try {
      const ticket = await requestSlipUploadAction(
        order.orderNumber,
        order.shipping.phone,
        chosen.type,
        chosen.size,
      );
      if ('error' in ticket) {
        setMessage({ tone: 'danger', text: ticket.error });
        return;
      }
      const form = new FormData();
      for (const [k, v] of Object.entries(ticket.upload.fields)) form.append(k, v);
      form.append('file', chosen);
      const res = await fetch(ticket.upload.url, { method: 'POST', body: form });
      if (!res.ok) {
        setMessage({ tone: 'danger', text: 'The upload failed. Please try again.' });
        return;
      }
      const done = await submitSlipAction(order.orderNumber, order.shipping.phone, ticket.uploadId);
      if ('error' in done) {
        setMessage({ tone: 'danger', text: done.error });
        return;
      }
      setStatus('PROOF_SUBMITTED');
      setMessage({
        tone: 'success',
        text: 'Thank you! We have your slip and will confirm your order after checking it.',
      });
      router.refresh();
    } catch {
      setMessage({ tone: 'danger', text: 'The upload failed. Please try again.' });
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }

  return (
    <section
      aria-labelledby="pay-heading"
      className="space-y-4 rounded-md border border-border bg-surface-muted p-4"
    >
      <h3 id="pay-heading" className="text-h3">
        Pay by bank transfer
      </h3>
      {status === 'REJECTED' && (
        <Alert>
          We could not accept your last slip{order.paymentNote ? `: ${order.paymentNote}` : '.'}{' '}
          Please upload a new one.
        </Alert>
      )}
      <p className="text-sm">
        Transfer <span className="font-medium">the order total</span> to the account below, then
        upload your payment slip (a screenshot or photo from your banking app). We confirm your
        order once we have checked it.
      </p>
      {bank === undefined && <p className="text-sm text-muted">Loading bank details…</p>}
      {bank === null && (
        <p className="text-sm text-muted">
          Bank details are not available right now. Please contact us.
        </p>
      )}
      {bank && (
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Account name</dt>
          <dd className="font-medium">{bank.accountName}</dd>
          <dt className="text-muted">Bank</dt>
          <dd className="font-medium">{bank.bankName}</dd>
          <dt className="text-muted">Branch</dt>
          <dd className="font-medium">{bank.branch}</dd>
          <dt className="text-muted">Account number</dt>
          <dd className="font-medium tabular">{bank.accountNumber}</dd>
          <dt className="text-muted">Reference</dt>
          <dd className="font-medium tabular">{order.orderNumber}</dd>
          {bank.instructions && <dd className="text-muted sm:col-span-2">{bank.instructions}</dd>}
        </dl>
      )}

      {status === 'PROOF_SUBMITTED' && !message && (
        <Alert tone="info">
          We have your slip and are checking it. You can upload a different one below if needed.
        </Alert>
      )}
      <div>
        <label htmlFor="slip" className="block text-sm font-medium">
          Payment slip{' '}
          <span className="font-normal text-muted">(JPG, PNG, WebP or PDF, up to 5 MB)</span>
        </label>
        <input
          ref={file}
          id="slip"
          type="file"
          accept={PROOF_CONTENT_TYPES.join(',')}
          disabled={busy}
          className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-border file:bg-surface file:px-4"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void upload(chosen);
          }}
        />
        {busy && <p className="mt-2 text-sm text-muted">Uploading…</p>}
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </section>
  );
}
