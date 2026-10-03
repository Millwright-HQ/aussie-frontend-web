import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

const control =
  'block min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-text placeholder:text-muted/70 aria-[invalid=true]:border-danger';

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired with aria-describedby (docs/DESIGN_GUIDELINES.md §10). */
export function Field({ id, label, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: boolean, error?: boolean) =>
  [error ? `${id}-error` : '', hint && !error ? `${id}-hint` : ''].filter(Boolean).join(' ') ||
  undefined;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  invalid?: boolean;
  hasHint?: boolean;
}

export function Input({ id, invalid, hasHint, className, ...props }: InputProps) {
  return (
    <input
      id={id}
      name={props.name ?? id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hasHint, invalid)}
      className={cn(control, className)}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  invalid?: boolean;
}

export function Select({ id, invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      id={id}
      name={props.name ?? id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, false, invalid)}
      className={cn(control, 'pr-8', className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  id,
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; invalid?: boolean }) {
  return (
    <textarea
      id={id}
      name={props.name ?? id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, false, invalid)}
      className={cn(control, 'py-2', className)}
      {...props}
    />
  );
}

export function Checkbox({
  id,
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode }) {
  return (
    <label htmlFor={id} className={cn('flex items-start gap-3 text-sm', className)}>
      <input
        id={id}
        name={props.name ?? id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 accent-primary"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function Alert({
  tone = 'danger',
  children,
  className,
}: {
  tone?: 'danger' | 'success' | 'info' | 'warning';
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/40 bg-success/10 text-success'
      : tone === 'info'
        ? 'border-border bg-surface-muted text-text'
        : tone === 'warning'
          ? 'border-warning/50 bg-warning/10 text-text'
          : 'border-danger/40 bg-danger/10 text-danger';
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-sm border px-4 py-3 text-sm', toneClass, className)}
    >
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-md border border-border bg-surface p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}
