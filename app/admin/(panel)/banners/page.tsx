import type { Banner } from '@aussie/shared-types';
import { Card, Field, Input } from '@aussie/ui';
import { requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import { createBannerAction, deleteBannerAction, updateBannerAction } from '../site/actions';
import { ImageUploader } from '../site/image-uploader';

export const metadata = { title: 'Banners' };

const cdn = process.env.NEXT_PUBLIC_CDN_URL ?? '';

/** The fields of one banner, for both "add" and "edit". */
function BannerFields({ banner, idPrefix }: { banner?: Banner; idPrefix: string }) {
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ImageUploader
          name="imagePath"
          label="Picture"
          initialPath={banner?.imagePath}
          previewUrlBase={cdn}
        />
        <p className="mt-1 text-xs text-muted">
          Wide pictures work best (about 1600 × 700). Keep the important part in the middle, since
          phones crop the sides.
        </p>
      </div>
      <Field
        id={id('alt')}
        label="Picture description"
        hint="Read aloud to people who cannot see the picture"
        className="sm:col-span-2"
      >
        <Input
          id={id('alt')}
          name="alt"
          defaultValue={banner?.alt}
          maxLength={160}
          required
          hasHint
        />
      </Field>
      <Field id={id('title')} label="Headline" optional>
        <Input id={id('title')} name="title" defaultValue={banner?.title} maxLength={80} />
      </Field>
      <Field id={id('subtitle')} label="Sub-headline" optional>
        <Input
          id={id('subtitle')}
          name="subtitle"
          defaultValue={banner?.subtitle}
          maxLength={160}
        />
      </Field>
      <Field id={id('buttonLabel')} label="Button text" optional>
        <Input
          id={id('buttonLabel')}
          name="buttonLabel"
          defaultValue={banner?.buttonLabel}
          maxLength={30}
        />
      </Field>
      <Field
        id={id('href')}
        label="Link"
        hint="A page like /shop or /c/skincare, or an address starting with https://"
        optional
      >
        <Input id={id('href')} name="href" defaultValue={banner?.href} hasHint />
      </Field>
      <Field id={id('sortOrder')} label="Order" hint="Smaller numbers show first">
        <Input
          id={id('sortOrder')}
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={banner?.sortOrder ?? 0}
          required
          hasHint
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3 self-end text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={banner?.active ?? true}
          className="size-5 accent-primary"
        />
        Show this banner
      </label>
      <Field id={id('startsOn')} label="Show from" hint="Leave empty to start now" optional>
        <Input
          id={id('startsOn')}
          name="startsOn"
          type="date"
          defaultValue={banner?.startsOn}
          hasHint
        />
      </Field>
      <Field id={id('endsOn')} label="Show until" hint="Leave empty to keep showing" optional>
        <Input id={id('endsOn')} name="endsOn" type="date" defaultValue={banner?.endsOn} hasHint />
      </Field>
    </div>
  );
}

export default async function BannersPage() {
  await requirePermission('content:write');
  const { banners } = await api<{ banners: Banner[] }>('admin', '/v1/content/admin/site');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
  const live = (b: Banner) =>
    b.active && (!b.startsOn || today >= b.startsOn) && (!b.endsOn || today <= b.endsOn);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-h1">Banners</h1>
        <p className="mt-1 text-sm text-muted">
          The pictures that slide across the top of your home page. With no banners the home page
          shows a simple welcome message instead. Changes show within a minute.
        </p>
      </div>

      <Card>
        <h2 className="text-h3">Add a banner</h2>
        <ActionForm action={createBannerAction} submitLabel="Add banner" className="mt-4">
          <BannerFields idPrefix="new" />
        </ActionForm>
      </Card>

      {banners.length === 0 ? (
        <p className="text-sm text-muted">No banners yet.</p>
      ) : (
        banners.map((b) => (
          <Card key={b.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h3">{b.title ?? b.alt}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  live(b) ? 'bg-success/15 text-success' : 'bg-surface-muted text-muted'
                }`}
              >
                {live(b) ? 'Showing now' : b.active ? 'Scheduled or expired' : 'Hidden'}
              </span>
            </div>
            <ActionForm
              action={updateBannerAction.bind(null, b.id)}
              submitLabel="Save banner"
              className="mt-4"
            >
              <BannerFields banner={b} idPrefix={b.id} />
            </ActionForm>
            <div className="mt-4 border-t border-border pt-4">
              <ActionForm
                action={deleteBannerAction.bind(null, b.id)}
                submitLabel="Delete banner"
                variant="danger"
                size="sm"
              />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
