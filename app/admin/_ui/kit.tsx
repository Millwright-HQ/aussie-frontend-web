import { cn, cva, formatLkPhone, formatLkr, Swatch, type VariantProps } from '@aussie/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentPropsWithRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/**
 * The admin's own components (the shop keeps the ones in @aussie/ui): compact, rounded, quiet
 * borders. Colours come from the tokens only. Same prop names as the shop kit so pages can swap.
 */
export { cn, formatLkPhone, formatLkr, Swatch };

// ── Buttons ───────────────────────────────────────────────────────────────────

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg shadow-sm hover:bg-primary/90',
        secondary: 'bg-surface-muted text-text hover:bg-border',
        outline: 'border border-border bg-surface text-text shadow-sm hover:bg-surface-muted',
        ghost: 'text-text hover:bg-surface-muted',
        danger: 'bg-danger text-white shadow-sm hover:bg-danger/90',
        'danger-soft': 'bg-danger/10 text-danger hover:bg-danger/20',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ComponentPropsWithRef<'button'>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

const iconBase =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-2 disabled:opacity-50';

/** Square icon button with an accessible name and tooltip (edit, delete, view…). */
export function IconButton({
  label,
  tone,
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'danger' }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        iconBase,
        tone === 'danger' && 'hover:bg-danger/10 hover:text-danger',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconLink({
  label,
  href,
  tone,
  className,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  label: string;
  href: string;
  tone?: 'danger';
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        iconBase,
        tone === 'danger' && 'hover:bg-danger/10 hover:text-danger',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

// ── Form controls ─────────────────────────────────────────────────────────────

const control =
  'block h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text shadow-sm placeholder:text-muted/70 transition-colors hover:border-text/30 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60 aria-[invalid=true]:border-danger';

export interface FieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  optional?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function Field({ id, label, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium">
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
        <p id={`${id}-error`} className="text-[13px] text-danger">
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
  invalid?: boolean | undefined;
  hasHint?: boolean | undefined;
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

export function Select({
  id,
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; invalid?: boolean }) {
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
      className={cn(control, 'h-auto min-h-20 py-2', className)}
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
    <label htmlFor={id} className={cn('flex items-start gap-2.5 text-sm', className)}>
      <input
        id={id}
        name={props.name ?? id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded accent-primary"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

// ── Messages, cards, badges ───────────────────────────────────────────────────

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
      ? 'border-success/30 bg-success/10 text-text [&_a]:text-success'
      : tone === 'info'
        ? 'border-primary/25 bg-primary/10 text-text'
        : tone === 'warning'
          ? 'border-warning/35 bg-warning/10 text-text'
          : 'border-danger/30 bg-danger/10 text-text';
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3 text-sm', toneClass, className)}
    >
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

/** A titled card; `flush` lets a table or list touch the card edges. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-surface shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className={flush ? undefined : 'p-5'}>{children}</div>}
    </section>
  );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

function badgeTone(tone: BadgeTone): string {
  switch (tone) {
    case 'success':
      return 'bg-success/12 text-success';
    case 'warning':
      return 'bg-warning/14 text-warning';
    case 'danger':
      return 'bg-danger/12 text-danger';
    case 'info':
      return 'bg-primary/12 text-primary';
    default:
      return 'bg-surface-muted text-muted';
  }
}

/** Soft pill with a dot, so state never relies on colour alone (the words are always there). */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeTone(tone),
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

// ── Page structure ────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-[13px] text-muted hover:text-text"
        >
          <ChevronLeft aria-hidden size={14} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Link tabs for the pages of one section (Products | Brands | Categories…). */
export function SectionTabs({
  items,
  current,
}: {
  items: { href: string; label: string; count?: number | undefined }[];
  current: string;
}) {
  return (
    <nav aria-label="Section" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? 'page' : undefined}
          className="-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm whitespace-nowrap text-muted hover:text-text aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-text"
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs tabular">
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Filter pills (status etc.) as links. */
export function Pills({
  items,
  current,
}: {
  items: { href: string; label: string; count?: number | undefined; key: string }[];
  current: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          aria-current={p.key === current ? 'page' : undefined}
          className="rounded-full border border-border bg-surface px-3 py-1 text-[13px] text-muted hover:text-text aria-[current=page]:border-primary aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-text"
        >
          {p.label}
          {p.count !== undefined && <span className="ml-1.5 tabular text-muted">{p.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  href,
  attention,
  icon,
  trend,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  href?: string;
  /** Something is waiting for a person. */
  attention?: boolean;
  icon?: ReactNode;
  trend?: { text: string; tone: 'up' | 'down' | 'flat' };
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted">{label}</p>
        {icon && (
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-[10px] bg-primary/10 text-primary"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
        {trend && (
          <span
            className={
              trend.tone === 'up' ? 'text-success' : trend.tone === 'down' ? 'text-danger' : ''
            }
          >
            {trend.tone === 'up' ? '▲ ' : trend.tone === 'down' ? '▼ ' : ''}
            {trend.text}
          </span>
        )}
        {note && <span>{note}</span>}
      </div>
      {attention && <p className="mt-2 text-xs font-medium text-warning">● Needs attention</p>}
    </>
  );
  const cls = 'block rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors';
  return href ? (
    <Link href={href} className={cn(cls, 'hover:border-primary/50')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <span
          aria-hidden
          className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-muted text-muted"
        >
          {icon}
        </span>
      )}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Tables ────────────────────────────────────────────────────────────────────

/** Rounded, scrollable table container (put <Table> inside, or use it with `flush` Panel). */
export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn('w-full text-left text-sm', className)}>{children}</table>;
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-muted/60 text-xs font-medium text-muted">
      {children}
    </thead>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 font-medium whitespace-nowrap', className)}>{children}</th>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('transition-colors hover:bg-surface-muted/50', className)}>{children}</tr>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn('px-4 py-3 align-middle', className)}>
      {children}
    </td>
  );
}

/** Row of icon buttons at the end of a table row. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

export function Pager({
  prev,
  next,
  note,
}: {
  prev?: string | undefined;
  next?: string | null | undefined;
  note?: ReactNode;
}) {
  if (!prev && !next) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{note}</span>
      <div className="flex gap-2">
        {prev ? (
          <Link href={prev} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ChevronLeft aria-hidden size={14} /> Newer
          </Link>
        ) : null}
        {next ? (
          <Link href={next} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Older <ChevronRight aria-hidden size={14} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Small round initials/picture for people. */
export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string | undefined;
  size?: 24 | 28 | 32 | 40 | 56 | 80;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const dim =
    size === 24
      ? 'size-6 text-[10px]'
      : size === 28
        ? 'size-7 text-[11px]'
        : size === 32
          ? 'size-8 text-xs'
          : size === 40
            ? 'size-10 text-sm'
            : size === 56
              ? 'size-14 text-lg'
              : 'size-20 text-2xl';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- small data URL, nothing to optimise
    <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover', dim, className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary',
        dim,
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}
