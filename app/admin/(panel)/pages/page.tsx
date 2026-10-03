import type { InfoPage } from '@aussie/shared-types';
import { Card } from '@aussie/ui';
import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';

export const metadata = { title: 'Pages' };

export default async function PagesList() {
  await requirePermission('content:write');
  const { pages } = await api<{ pages: InfoPage[] }>('admin', '/v1/content/admin/site');

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-h1">Pages</h1>
        <p className="mt-1 text-sm text-muted">
          Terms and conditions, privacy policy and the other information pages linked from your
          shop&apos;s footer. Pages that still show the built-in starter text are marked: replace it
          with your own wording, and have your terms, privacy and returns text checked by someone
          who knows Sri Lankan consumer law before you launch.
        </p>
      </div>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {pages.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link
                  href={`/admin/pages/${p.slug}`}
                  className="font-medium text-primary hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-muted">
                  /info/{p.slug}
                  {p.updatedAt ? ` · saved ${formatDateTime(p.updatedAt)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {p.isPlaceholder && (
                  <span className="rounded-full bg-warning/15 px-3 py-1 font-medium text-warning">
                    Starter text: replace
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 font-medium ${
                    p.published ? 'bg-success/15 text-success' : 'bg-surface-muted text-muted'
                  }`}
                >
                  {p.published ? 'Published' : 'Hidden'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
