import { BrandLogo } from '@/components/brand-logo';
import { readSiteLock } from '@/lib/site-lock';
import { UnlockForm } from './unlock-form';

export const metadata = {
  title: 'Coming soon',
  robots: { index: false, follow: false },
};

/** What visitors see while the launch lock is on. Shown by the proxy for every shop page. */
export default async function ComingSoonPage() {
  const lock = await readSiteLock();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <h1 className="flex justify-center">
        <BrandLogo height="h-12" />
      </h1>
      <p className="mt-4 text-muted">
        {lock.message ?? 'We are getting ready to open. Please check back soon.'}
      </p>
      <UnlockForm />
    </main>
  );
}
