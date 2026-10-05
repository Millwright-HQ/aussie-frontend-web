'use client';

import { Alert, Button } from '@/app/admin/_ui';
import { type ReactNode, useActionState, useEffect, useState } from 'react';
import type { ActionState } from './actions';

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
  inline?: boolean;
};

/**
 * Form bound to a server action, showing success/error inline (no browser dialogs).
 *
 * After a successful save React resets the form's fields and does not always pick up the freshly
 * loaded values (a dropdown can snap back to its old choice). So on success the fields are
 * remounted from the new server data, and the message lives outside so it stays visible.
 */
export function ActionForm(props: Props) {
  const [version, setVersion] = useState(0);
  const [done, setDone] = useState<ActionState>({});

  return (
    <div className={props.className}>
      <FormBody
        key={version}
        {...props}
        className={undefined}
        onResult={(result) => {
          setDone(result);
          if (result.ok) setVersion((v) => v + 1);
        }}
      />
      {done.error && (
        <Alert className="mt-3" tone="danger">
          {done.error}
        </Alert>
      )}
      {done.ok && (
        <Alert className="mt-3" tone="success">
          {done.ok}
        </Alert>
      )}
    </div>
  );
}

function FormBody({
  action,
  children,
  submitLabel,
  variant = 'primary',
  size = 'md',
  inline,
  onResult,
}: Props & { onResult: (result: ActionState) => void }) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok || state.error) onResult(state);
    // onResult only sets state in the parent; running once per result is the intent
  }, [state]);

  return (
    <form action={formAction}>
      <div className={inline ? 'flex flex-wrap items-end gap-2' : 'space-y-4'}>
        {children}
        <Button type="submit" variant={variant} size={size} disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
