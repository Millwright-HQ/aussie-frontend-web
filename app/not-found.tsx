import Link from 'next/link';
import { buttonVariants } from '@aussie/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h1">Page not found</h1>
      <p className="text-muted">The page you were looking for doesn’t exist or has moved.</p>
      <Link href="/" className={buttonVariants()}>
        Back to home
      </Link>
    </main>
  );
}
