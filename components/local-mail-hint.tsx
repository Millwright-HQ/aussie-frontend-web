import Link from 'next/link';

/**
 * Shown only in the local environment, where no real email is sent: points to the page that
 * lists the emails the emulator received (codes, temporary passwords).
 */
export function LocalMailHint({ to }: { to?: string | undefined }) {
  if (process.env.NEXT_PUBLIC_ENV_NAME !== 'local') return null;
  return (
    <p className="mt-4 rounded-md border border-dashed border-border bg-surface-muted p-3 text-xs text-muted">
      <span className="font-medium text-text">Local environment:</span> no real email is sent. Read
      the code in the{' '}
      <Link
        href={to ? `/dev/mail?to=${encodeURIComponent(to)}` : '/dev/mail'}
        target="_blank"
        className="font-medium text-primary underline"
      >
        local mail box
      </Link>
      .
    </p>
  );
}
