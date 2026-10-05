'use client';

import { type ReactNode, useActionState, useEffect, useId, useRef, useState } from 'react';
import { Button, type ButtonProps } from './kit';

/**
 * Asks "are you sure?" before a form submits, with a proper dialog instead of the browser's
 * `confirm()`. Wrap the trigger in a <form>; the dialog's confirm button submits that form.
 *
 *   <form action={signOut}><ConfirmSubmit title="Sign out?" confirmLabel="Sign out">Sign out</ConfirmSubmit></form>
 */
export function ConfirmSubmit({
  title,
  description,
  confirmLabel,
  tone = 'primary',
  children,
  triggerClassName,
  triggerVariant = 'ghost',
  triggerSize = 'sm',
  disabled,
  icon,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  children: ReactNode;
  triggerClassName?: string;
  triggerVariant?: ButtonProps['variant'];
  triggerSize?: ButtonProps['size'];
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      confirmBtn.current?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        disabled={disabled}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {icon}
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes it.
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && <div className="mt-2 text-sm text-muted">{description}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-surface-muted/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {/* A real submit button: the enclosing form posts with its action. */}
          <Button ref={confirmBtn} type="submit" variant={tone === 'danger' ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}

type ActionResult = { ok?: string; error?: string };

/**
 * A button that asks first, then runs a server action with the given hidden fields (delete this
 * brand, disable this admin…). Errors stay inside the dialog so nothing is lost.
 */
export function ConfirmAction({
  action,
  fields,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  children,
  label,
  variant = 'ghost',
  size = 'sm',
  className,
  iconOnly,
  extra,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  fields: Record<string, string>;
  /** Extra form fields shown in the dialog (a checkbox, a reason…). */
  extra?: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Trigger content (icon and/or text). */
  children: ReactNode;
  /** Accessible name, needed when the trigger is an icon only. */
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  // A finished action closes the dialog (the page behind it refreshes with the new data).
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? undefined : size}
        aria-label={label}
        title={label}
        className={
          iconOnly
            ? `size-8 shrink-0 p-0 ${tone === 'danger' ? 'text-muted hover:bg-danger/10 hover:text-danger' : 'text-muted'} ${className ?? ''}`
            : className
        }
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <form action={formAction}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="p-6">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && <div className="mt-2 text-sm text-muted">{description}</div>}
            {extra && <div className="mt-4">{extra}</div>}
            {state.error && (
              <p role="alert" className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-surface-muted/50 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={pending}>
              {pending ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/**
 * Asks first, then runs a client callback (for buttons that call actions from event handlers,
 * like deleting a picture). `iconOnly` makes a small square trigger.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = 'danger',
  children,
  label,
  variant = 'ghost',
  size = 'sm',
  iconOnly,
  disabled,
  className,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  tone?: 'primary' | 'danger';
  children: ReactNode;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? undefined : size}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={
          iconOnly
            ? `size-8 shrink-0 p-0 ${tone === 'danger' ? 'text-muted hover:bg-danger/10 hover:text-danger' : 'text-muted'} ${className ?? ''}`
            : className
        }
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && <div className="mt-2 text-sm text-muted">{description}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-surface-muted/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                setOpen(false);
              }
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
