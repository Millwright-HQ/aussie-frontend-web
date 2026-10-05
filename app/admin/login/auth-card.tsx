import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-[85dvh] items-center justify-center px-4 py-10">
      <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="mb-6 flex items-center justify-center gap-2.5 font-semibold tracking-tight">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-fg"
          >
            A
          </span>
          Aussie Admin
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-surface p-7 shadow-lg">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </main>
  );
}
