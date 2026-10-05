'use client';

import { Button } from '@aussie/ui';
import { useEffect, useId, useRef, useState } from 'react';

/**
 * "Sign out" that asks first. Put it inside the <form action={signOutAction}>: the dialog's
 * confirm button is the form's submit button, so nothing happens until it is pressed.
 */
export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-sm px-3 py-2 text-left text-sm whitespace-nowrap text-muted hover:bg-surface-muted"
      >
        Sign out
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-text shadow-md backdrop:bg-black/50"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-h3">
            Sign out?
          </h2>
          <p className="mt-2 text-sm text-muted">
            You will need to sign in again to see your orders and addresses. Your bag is kept.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-surface-muted px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Stay signed in
          </Button>
          <Button type="submit">Sign out</Button>
        </div>
      </dialog>
    </>
  );
}
