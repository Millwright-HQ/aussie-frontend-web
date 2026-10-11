'use client';

import { Alert, Button, Field, Input, Select, Textarea } from '@aussie/ui';
import { INQUIRY_TOPIC_LABELS, type InquiryTopic } from '@aussie/shared-types';
import { useActionState, useState } from 'react';
import { type ContactState, sendInquiryAction } from './contact-action';

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendInquiryAction, {});
  const [topic, setTopic] = useState<InquiryTopic | ''>('');
  const errors = new Map(Object.entries(state.fieldErrors ?? {}));
  const err = (k: string) => errors.get(k);

  if (state.ok) {
    return (
      <Alert tone="success">
        <span role="status">{state.ok}</span>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field id="c-name" label="Your name" error={err('name')}>
        <Input
          id="c-name"
          name="name"
          autoComplete="name"
          invalid={!!err('name')}
          required
          maxLength={100}
        />
      </Field>
      <Field id="c-email" label="Email" error={err('email')}>
        <Input
          id="c-email"
          name="email"
          type="email"
          autoComplete="email"
          invalid={!!err('email')}
          required
        />
      </Field>
      <Field
        id="c-phone"
        label="Mobile number"
        hint="If you would like a call back"
        error={err('phone')}
        optional
      >
        <Input
          id="c-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          invalid={!!err('phone')}
          hasHint
        />
      </Field>
      <Field id="c-topic" label="What is this about?" error={err('topic')}>
        <Select
          id="c-topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as InquiryTopic | '')}
          required
        >
          <option value="" disabled>
            Choose…
          </option>
          {Object.entries(INQUIRY_TOPIC_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {topic === 'ORDER' && (
        <Field
          id="c-order"
          label="Order number"
          hint="From your confirmation email, e.g. AC-26-00042"
          error={err('orderNumber')}
          className="sm:col-span-2"
        >
          <Input
            id="c-order"
            name="orderNumber"
            autoCapitalize="characters"
            invalid={!!err('orderNumber')}
            hasHint
            required
          />
        </Field>
      )}
      <Field id="c-subject" label="Subject" error={err('subject')} className="sm:col-span-2">
        <Input id="c-subject" name="subject" invalid={!!err('subject')} required maxLength={120} />
      </Field>
      <Field id="c-message" label="Message" error={err('message')} className="sm:col-span-2">
        <Textarea id="c-message" name="message" rows={6} required maxLength={2000} />
      </Field>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden className="sr-only">
        <label htmlFor="c-website">Leave this empty</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
