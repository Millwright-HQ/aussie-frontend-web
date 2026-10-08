import { Bell, Mail, Sparkles, Users } from 'lucide-react';
import { requirePermission } from '@/lib/admin';
import { Badge, Card, EmptyState, PageHeader } from '@/app/admin/_ui';

export const metadata = { title: 'Newsletter' };

const PLANNED = [
  {
    icon: Sparkles,
    title: 'New product announcements',
    text: 'Pick products you just added and send customers a clean email with photos, prices and a Shop now button.',
  },
  {
    icon: Bell,
    title: 'Offers and back-in-stock',
    text: 'Tell people about a sale, a festival offer, or that a sold-out item is back.',
  },
  {
    icon: Users,
    title: 'Only people who said yes',
    text: 'Goes only to customers who ticked the marketing box at sign-up. Everyone gets an unsubscribe link, and anyone who unsubscribes is never emailed again.',
  },
] as const;

export default async function NewsletterPage() {
  await requirePermission('content:write');
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Newsletter"
        description="Send news and new-product emails to customers who agreed to receive them."
        actions={<Badge tone="info">Coming soon</Badge>}
      />
      <Card>
        <EmptyState icon={<Mail size={20} />} title="Newsletters are coming soon">
          Nothing to set up yet. When this is ready you will write or pick products, preview the
          email, send yourself a test, and then send it to your subscribers.
        </EmptyState>
      </Card>
      <ul className="grid gap-4 sm:grid-cols-3">
        {PLANNED.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <Icon aria-hidden size={18} className="text-primary" />
            <p className="mt-2 text-sm font-medium">{title}</p>
            <p className="mt-1 text-[13px] text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
