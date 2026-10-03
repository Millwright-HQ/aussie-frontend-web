import { PAGE_SLUGS, type PageSlug } from '@aussie/shared-types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInfoPage } from '@/lib/content';
import { formatOrderDate } from '@/lib/order-format';
import { PageBody } from '../../_components/page-body';

const asSlug = (s: string): PageSlug | undefined => PAGE_SLUGS.find((p) => p === s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = asSlug((await params).slug);
  const page = slug ? await getInfoPage(slug) : null;
  return { title: page?.title ?? 'Page not found' };
}

/** Terms, privacy, returns, delivery, about and contact: text the owner edits in the admin. */
export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = asSlug((await params).slug);
  if (!slug) notFound();
  const page = await getInfoPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="text-h1">{page.title}</h1>
      {page.updatedAt && (
        <p className="mt-1 text-sm text-muted">Last updated {formatOrderDate(page.updatedAt)}</p>
      )}
      <div className="mt-6">
        <PageBody body={page.body} />
      </div>
    </article>
  );
}
