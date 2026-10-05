import { notFound } from 'next/navigation';
import { localMailEnabled, readLocalMail } from '@/lib/local-mail';
import { AutoRefresh } from './auto-refresh';

export const metadata = { title: 'Local mail', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Local development only (404 anywhere else): everything the emulator "emailed", newest first. */
export default async function LocalMailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  if (!localMailEnabled()) notFound();
  const { to } = await searchParams;
  const mails = await readLocalMail(to?.slice(0, 100));

  return (
    <div data-theme-root="admin" data-theme="dark" className="min-h-dvh bg-bg text-text">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Local mail</h1>
            <p className="mt-1 text-sm text-muted">
              Sign-up codes, password resets, admin invitations and order emails from this
              computer. Newest first; the list refreshes by itself. Only exists locally.
            </p>
          </div>
          <AutoRefresh />
        </div>
        <form className="mt-4 flex gap-2" role="search">
          <label htmlFor="to" className="sr-only">
            Only mail to
          </label>
          <input
            id="to"
            name="to"
            defaultValue={to}
            placeholder="Only mail to… (an email address)"
            className="h-10 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-fg">
            Filter
          </button>
        </form>

        {mails === null && (
          <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            The local mail box could not be read. Is the local AWS (Docker) running?
          </p>
        )}
        {mails?.length === 0 && <p className="mt-6 text-sm text-muted">No mail yet.</p>}
        <ul className="mt-6 space-y-3">
          {mails?.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{m.subject}</p>
                <time className="text-xs text-muted" dateTime={m.at}>
                  {new Date(m.at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-muted">To {m.to.join(', ') || '—'}</p>
              {m.highlights.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-2">
                  {m.highlights.map((h) => (
                    <code key={h} className="rounded-[8px] bg-primary/15 px-2 py-1 font-mono text-sm font-semibold text-primary select-all">
                      {h}
                    </code>
                  ))}
                </p>
              )}
              <p className="mt-2 text-sm break-words whitespace-pre-line text-muted">{m.text.slice(0, 700)}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
