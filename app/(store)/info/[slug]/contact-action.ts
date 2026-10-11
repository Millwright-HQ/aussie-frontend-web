'use server';

import { inquirySchema } from '@aussie/validation';
import { publicPost } from '@/lib/orders';

export interface ContactState {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

/** The Contact page form. The message is saved for the team, who answer by email. */
export async function sendInquiryAction(
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  // A hidden field real visitors never fill in: bots do. Look successful, save nothing.
  if (text(form, 'website') !== '') return { ok: 'Thank you! We have your message.' };

  const parsed = inquirySchema.safeParse({
    name: text(form, 'name'),
    email: text(form, 'email'),
    phone: text(form, 'phone'),
    topic: text(form, 'topic'),
    orderNumber: text(form, 'orderNumber'),
    subject: text(form, 'subject'),
    message: text(form, 'message'),
  });
  if (!parsed.success) {
    const first = new Map<string, string>();
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form');
      if (!first.has(key)) first.set(key, i.message);
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors: Object.fromEntries(first) };
  }

  const res = await publicPost<{ ok: boolean; ref: string }>('/v1/content/inquiries', parsed.data);
  if (!res.ok) return { error: res.message };
  return {
    ok: `Thank you! We have your message and will reply to ${parsed.data.email} soon. Your reference is ${res.data.ref}.`,
  };
}
