import type { ReactNode } from 'react';

/** Centered card for the sign-in / sign-up screens (storefront light theme). */
export function AuthShell({
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
    <div className={`mx-auto w-full px-4 py-12 md:py-16 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
