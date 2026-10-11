import { PAGE_SLUGS, type InfoPage } from '@aussie/shared-types';
import { Alert, Card, Field, Input, PageHeader, Textarea } from '@/app/admin/_ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import { savePageAction } from '../../actions';

export const metadata = { title: 'Edit page' };

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePermission('content:write');
  const { slug: requested } = await params;
  const slug = PAGE_SLUGS.find((s) => s === requested);
  if (!slug) notFound();
  const { pages } = await api<{ pages: InfoPage[] }>('admin', '/v1/content/admin/site');
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: '/admin/site/pages', label: 'Pages' }}
        title={page.title}
        description={
          <>
            Shown at{' '}
            <Link
              href={`/info/${page.slug}`}
              target="_blank"
              className="text-primary hover:underline"
            >
              /info/{page.slug}
            </Link>
          </>
        }
      />
      {page.isPlaceholder && (
        <Alert tone="warning">
          This page shows the built-in starter text. Edit it and save to replace it with your own.
        </Alert>
      )}
      <Card>
        <ActionForm action={savePageAction.bind(null, slug)} submitLabel="Save page">
          <Field id="title" label="Title">
            <Input id="title" name="title" defaultValue={page.title} maxLength={120} required />
          </Field>
          <Field
            id="body"
            label="Text"
            hint="See the guide below for headings, lists, bold text and links"
          >
            <Textarea
              id="body"
              name="body"
              rows={20}
              defaultValue={page.body}
              className="font-mono text-sm"
            />
          </Field>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={page.published}
              className="size-5 accent-primary"
            />
            Published (linked in the footer and visible to customers)
          </label>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="text-[15px] font-semibold">Formatting guide</h2>
        <pre className="mt-3 overflow-x-auto rounded-sm bg-surface-muted p-4 text-xs leading-relaxed">{`## A heading
Start a new paragraph after a blank line.

- A bullet point
- Another bullet point

1. A numbered step
2. Another step

Make text **bold**. Add a [link](/shop) or a [secure link](https://example.lk).`}</pre>
        <p className="mt-2 text-xs text-muted">
          Links can go to a page on your shop (starting with /), a secure address (https://), an
          email (mailto:) or a phone number (tel:). Anything else is shown as plain text.
        </p>
      </Card>
    </div>
  );
}
