'use server';

import type { BankDetails, OrderView } from '@aussie/shared-types';
import {
  MAX_PROOF_BYTES,
  proofRequestSchema,
  proofSubmitSchema,
  type ProofRequest,
} from '@aussie/validation';
import { getBankDetails, publicPost } from '@/lib/orders';

/** The store's bank account, fetched on demand so tracking results (a client component) can show it. */
export async function bankDetailsAction(): Promise<Omit<BankDetails, 'updatedAt'> | null> {
  return getBankDetails();
}

export type SlipTicket =
  { error: string } | { uploadId: string; upload: { url: string; fields: Record<string, string> } };

/** Step 1 of uploading a payment slip: a one-time upload slot (order number + phone prove the order is theirs). */
export async function requestSlipUploadAction(
  orderNumber: string,
  phone: string,
  contentType: string,
  size: number,
): Promise<SlipTicket> {
  if (!Number.isFinite(size) || size < 1 || size > MAX_PROOF_BYTES) {
    return { error: 'The slip must be 5 MB or smaller.' };
  }
  const parsed = proofRequestSchema.safeParse({ orderNumber, phone, contentType });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the file' };
  const request: ProofRequest = parsed.data;
  const res = await publicPost<{
    uploadId: string;
    upload: { url: string; fields: Record<string, string> };
  }>('/v1/orders/payment-proof/request', request);
  return res.ok ? res.data : { error: res.message };
}

/** Step 2: the browser finished uploading; attach the slip to the order. */
export async function submitSlipAction(
  orderNumber: string,
  phone: string,
  uploadId: string,
): Promise<{ order: OrderView } | { error: string }> {
  const parsed = proofSubmitSchema.safeParse({ orderNumber, phone, uploadId });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the details' };
  const res = await publicPost<OrderView>('/v1/orders/payment-proof/submit', parsed.data);
  return res.ok ? { order: res.data } : { error: res.message };
}
