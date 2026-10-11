import { PAGE_SLUGS, type PageSlug } from '@aussie/shared-types';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInfoPage, getSite } from '@/lib/content';
import { formatOrderDate } from '@/lib/order-format';
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site';
import { PageBody } from '../../_components/page-body';
import { ContactForm } from './contact-form';

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
      {slug !== 'contact' && page.updatedAt && (
        <p className="mt-1 text-sm text-muted">Last updated {formatOrderDate(page.updatedAt)}</p>
      )}
      <div className="mt-6">
        <PageBody body={page.body} />
      </div>
      {slug === 'contact' && <ContactSection />}
    </article>
  );
}

/** Ways to reach the store (from Site settings; the shop email is the fallback), then the form. */
async function ContactSection() {
  const { settings } = await getSite();
  const email = settings.email ?? DEFAULT_CONTACT_EMAIL;
  const whatsapp = settings.whatsapp?.replace(/\D/g, '');
  const methods = [
    ...(settings.phone
      ? [
          {
            icon: Phone,
            label: 'Call us',
            text: settings.phone,
            href: `tel:${settings.phone.replace(/[^+\d]/g, '')}`,
          },
        ]
      : []),
    ...(whatsapp
      ? [
          {
            icon: MessageCircle,
            label: 'WhatsApp',
            text: settings.whatsapp ?? '',
            hint: 'Chat with us',
            href: `https://wa.me/${whatsapp}`,
            external: true,
          },
        ]
      : []),
    { icon: Mail, label: 'Email', text: email, href: `mailto:${email}` },
    ...(settings.address ? [{ icon: MapPin, label: 'Visit', text: settings.address }] : []),
  ];

  return (
    <div className="mt-8 space-y-10">
      <ul className="grid gap-3 sm:grid-cols-2">
        {methods.map((m) => {
          const Icon = m.icon;
          const body = (
            <>
              <Icon aria-hidden size={20} className="mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-xs text-muted">
                  {m.label}
                  {'hint' in m && m.hint ? ` · ${m.hint}` : ''}
                </span>
                <span className="block font-medium break-words">{m.text}</span>
              </span>
            </>
          );
          const box = 'flex gap-3 rounded-md border border-border bg-surface p-4';
          return (
            <li key={m.label}>
              {'href' in m && m.href ? (
                <a
                  href={m.href}
                  className={`${box} hover:bg-surface-muted`}
                  {...('external' in m ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {body}
                </a>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="send-message">
        <h2 id="send-message" className="text-h3">
          Send us a message
        </h2>
        <p className="mt-1 text-sm text-muted">
          Tell us what you need and we will reply to your email. Pick the topic that fits best so it
          reaches the right person.
        </p>
        <div className="mt-4">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
