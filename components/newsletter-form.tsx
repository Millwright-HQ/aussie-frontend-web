'use client';

import { useActionState } from 'react';
import { type NewsletterState, subscribeAction } from '@/app/newsletter-action';

/** One-line email sign-up. `source` records where the lead came from. */
export function NewsletterForm({
  source,
  button = 'Subscribe',
  idPrefix = 'nl',
}: {
  source: 'footer' | 'coming-soon';
  button?: string;
  idPrefix?: string;
}) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, {});
  if (state.ok) {
    return (
      <p className="text-sm text-success" role="status">
        {state.ok}
      </p>
    );
  }
  return (
    <form action={action} noValidate>
      <input type="hidden" name="source" value={source} />
      <label htmlFor={`${idPrefix}-email`} className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Your email"
          required
          aria-invalid={state.error ? true : undefined}
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 text-sm text-text"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-sm bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-60"
        >
          {pending ? 'Saving…' : button}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
