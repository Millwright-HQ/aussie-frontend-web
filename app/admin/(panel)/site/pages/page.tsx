import type { InfoPage } from '@aussie/shared-types';
import { Badge, Card, PageHeader } from '@/app/admin/_ui';
import Link from 'next/link';
import { formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { SiteTabs } from '../tabs';

export const metadata = { title: 'Pages' };

export default async function PagesList() {
  const me = await requirePermission('content:write');
  const { pages } = await api<{ pages: InfoPage[] }>('admin', '/v1/content/admin/site');

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Site settings"
        description="Terms and conditions, privacy policy and the other information pages linked from your shop's footer. Pages that still show the built-in starter text are marked: replace it with your own wording, and have your terms, privacy and returns text checked by someone who knows Sri Lankan consumer law before you launch."
      />
      <SiteTabs me={me} current="/admin/site/pages" />
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {pages.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link
                  href={`/admin/site/pages/${p.slug}`}
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
                {p.isPlaceholder && <Badge tone="warning">Starter text: replace</Badge>}
                <Badge tone={p.published ? 'success' : 'neutral'}>
                  {p.published ? 'Published' : 'Hidden'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
