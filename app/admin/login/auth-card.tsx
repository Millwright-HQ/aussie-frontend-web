import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-[85dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-surface p-8 shadow-md">
        <div>
          <p className="text-xs font-medium tracking-[0.04em] text-muted uppercase">
            Aussie Cosmetics · Admin
          </p>
          <h1 className="mt-1 text-h2">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
        {footer}
      </div>
    </main>
  );
}
