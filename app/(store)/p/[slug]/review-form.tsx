'use client';

import { Alert, Button, Field, Input, Textarea } from '@aussie/ui';
import { useActionState } from 'react';
import { type ReviewFormState, submitReviewAction } from './review-actions';

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(
    submitReviewAction.bind(null, productId, slug),
    {},
  );
  if (state.ok) return <Alert tone="success">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Your rating</legend>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                className="size-5 accent-primary"
              />
              {n} star{n === 1 ? '' : 's'}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="title" label="Headline" optional>
        <Input id="title" name="title" maxLength={100} autoComplete="off" />
      </Field>
      <Field id="body" label="Your review" hint="At least 10 characters. Plain text only.">
        <Textarea id="body" name="body" rows={5} required minLength={10} maxLength={2000} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Submit review'}
      </Button>
      <p className="text-xs text-muted">
        We show your first name and last initial. Reviews appear after we have approved them.
      </p>
    </form>
  );
}
