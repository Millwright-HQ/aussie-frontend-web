'use client';

import { passwordChecks } from '@aussie/validation';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

/** Live list of password rules: each turns into a tick as the typed password meets it. */
export function PasswordChecklist({
  password,
  minLength,
  className = '',
}: {
  password: string;
  minLength: number;
  className?: string;
}) {
  const checks = passwordChecks(password, minLength);
  const met = checks.filter((c) => c.ok).length;
  const strength = password.length === 0 ? 0 : met;
  return (
    <div className={className}>
      <div className="flex gap-1" aria-hidden>
        {checks.map((c, i) => (
          <span
            key={c.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < strength ? (met === checks.length ? 'bg-success' : 'bg-warning') : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {met === checks.length
          ? 'Password meets every requirement'
          : `${met} of ${checks.length} password requirements met`}
      </p>
      <ul className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.id} className={`flex items-center gap-1.5 ${c.ok ? 'text-success' : 'text-muted'}`}>
            {c.ok ? (
              <Check aria-hidden size={14} strokeWidth={2.5} className="shrink-0" />
            ) : (
              <Circle aria-hidden size={14} className="shrink-0" />
            )}
            <span>
              {c.label}
              <span className="sr-only">{c.ok ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const defaultInput =
  'block min-h-11 w-full rounded-sm border border-border bg-surface px-3 pr-11 text-base text-text aria-[invalid=true]:border-danger';
const defaultLabel = 'block text-sm font-medium';

/**
 * "New password" + "Confirm password" with live feedback while typing: the rule checklist, and
 * whether the two match. The server still checks everything again.
 */
export function NewPasswordPair({
  minLength,
  passwordName = 'password',
  confirmName = 'confirm',
  passwordLabel = 'New password',
  confirmLabel = 'Confirm password',
  errors,
  inputClassName = defaultInput,
  labelClassName = defaultLabel,
  idPrefix,
  /** Hide the "confirm" field (for forms that ask for the password only once). */
  single,
}: {
  minLength: number;
  passwordName?: string;
  confirmName?: string;
  passwordLabel?: string;
  confirmLabel?: string;
  errors?: Record<string, string> | undefined;
  inputClassName?: string;
  labelClassName?: string;
  idPrefix?: string;
  single?: boolean;
}) {
  const auto = useId();
  const pid = `${idPrefix ?? auto}-pw`;
  const cid = `${idPrefix ?? auto}-confirm`;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const errorOf = (key: string) => Object.entries(errors ?? {}).find(([k]) => k === key)?.[1];
  const pwError = errorOf(passwordName);
  const confirmError = errorOf(confirmName);
  const mismatch = confirm.length > 0 && confirm !== password;
  const match = confirm.length > 0 && confirm === password;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={pid} className={labelClassName}>
          {passwordLabel}
        </label>
        <div className="relative">
          <input
            id={pid}
            name={passwordName}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={pwError ? true : undefined}
            aria-describedby={`${pid}-rules`}
            required
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted hover:bg-surface-muted hover:text-text"
          >
            {show ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
          </button>
        </div>
        {pwError && <p className="text-sm text-danger">{pwError}</p>}
        <PasswordChecklist
          password={password}
          minLength={minLength}
          className="pt-1"
        />
        <span id={`${pid}-rules`} className="sr-only">
          Password requirements are listed below the field.
        </span>
      </div>

      {!single && (
        <div className="space-y-1.5">
          <label htmlFor={cid} className={labelClassName}>
            {confirmLabel}
          </label>
          <input
            id={cid}
            name={confirmName}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={confirmError || mismatch ? true : undefined}
            required
            className={inputClassName}
          />
          <p
            className={`text-[13px] ${mismatch ? 'text-danger' : match ? 'text-success' : 'sr-only'}`}
            aria-live="polite"
          >
            {mismatch ? 'Passwords do not match yet.' : match ? 'Passwords match.' : ''}
          </p>
          {confirmError && <p className="text-sm text-danger">{confirmError}</p>}
        </div>
      )}
    </div>
  );
}
