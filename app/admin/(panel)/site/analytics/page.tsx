import type { AnalyticsReport, Counted, OrdersAnalytics } from '@aussie/shared-types';
import Link from 'next/link';
import { Alert, AreaChart, BarList, Donut, PageHeader, Panel, Pills, Stat } from '@/app/admin/_ui';
import { can, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { SiteTabs } from '../tabs';

export const metadata = { title: 'Visitors' };

const RANGES = [7, 30, 90] as const;
const SHORT_DATE = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const n = (v: number) => v.toLocaleString('en-LK');
const share = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : '–';

const WORDS = new Map(
  Object.entries({
    direct: 'Direct (typed the address, or no referrer)',
    mobile: 'Phone',
    tablet: 'Tablet',
    desktop: 'Computer',
    other: 'Other',
    chrome: 'Chrome',
    safari: 'Safari',
    firefox: 'Firefox',
    edge: 'Edge',
    samsung: 'Samsung Internet',
    opera: 'Opera',
    android: 'Android',
    ios: 'iPhone / iPad',
    windows: 'Windows',
    macos: 'Mac',
    linux: 'Linux',
  }),
);
const PAGE_NAMES = new Map(
  Object.entries({
    '/': 'Home',
    '/shop': 'All products',
    '/cart': 'Bag',
    '/checkout': 'Checkout',
    '/search': 'Search',
    '/track': 'Track an order',
    '/account': 'Account',
    '/order/placed': 'Order placed',
  }),
);

function countryName(code: string): string {
  if (code === 'XX') return 'Unknown';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** A breakdown as a bar list with each row's share of the total. */
function Breakdown({
  rows,
  label,
  empty,
}: {
  rows: Counted[];
  label?: (key: string) => string;
  empty?: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <BarList
      {...(empty ? { empty } : {})}
      format={n}
      rows={rows.map((r) => ({
        label: label ? label(r.key) : r.key,
        value: r.count,
        note: share(r.count, total),
      }))}
    />
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const me = await requirePermission('content:write');
  const requested = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const [report, orders, catalog] = await Promise.all([
    api<AnalyticsReport>('admin', `/v1/content/admin/analytics?days=${days}`),
    can(me, 'order:read')
      ? api<OrdersAnalytics>('admin', `/v1/orders/admin/analytics?days=${days}`).catch(() => null)
      : null,
    can(me, 'product:read')
      ? api<{ items: { id: string; name: string }[] }>('admin', '/v1/catalog/admin/products').catch(
          () => ({ items: [] }),
        )
      : { items: [] },
  ]);
  const names = new Map(catalog.items.map((p) => [p.id, p.name]));
  const t = report.totals;
  const empty = t.views === 0 && t.productViews === 0;
  const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const funnel = [
    { label: 'Visits', value: t.visitors },
    { label: 'Viewed a product', value: t.productViews },
    { label: 'Added to bag', value: t.cartAdds },
    { label: 'Started checkout', value: t.checkouts },
    ...(orders ? [{ label: 'Placed an order', value: orders.totals.orders }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site settings"
        description="Who comes to the shop and what they look at. No cookies and no addresses are stored: each visitor is an anonymous code that changes every day. Search engines and other crawlers are not counted, and neither are you while you are signed in as an admin."
        actions={
          <Pills
            current={String(days)}
            items={RANGES.map((d) => ({
              key: String(d),
              label: `${d} days`,
              href: d === 30 ? '/admin/site/analytics' : `/admin/site/analytics?days=${d}`,
            }))}
          />
        }
      />
      <SiteTabs me={me} current="/admin/site/analytics" />

      {empty && (
        <Alert tone="info">
          No visits recorded in this period yet. Counting starts when the shop is released with this
          feature; numbers appear within a minute of the first visit.
        </Alert>
      )}

      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Visits"
          value={n(t.visitors)}
          note="People, counted once a day. Someone who comes on two days counts twice."
        />
        <Stat
          label="Page views"
          value={n(t.views)}
          note={`${SHORT_DATE(report.from)} to ${SHORT_DATE(report.to)}`}
        />
        <Stat label="Product views" value={n(t.productViews)} />
        <Stat
          label="Added to bag"
          value={n(t.cartAdds)}
          note={share(t.cartAdds, t.productViews) + ' of product views'}
        />
        <Stat
          label="Orders"
          value={orders ? n(orders.totals.orders) : '–'}
          note={orders ? `${share(orders.totals.orders, t.visitors)} of visits` : undefined}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Visitors per day" description="Unique people each day.">
          <AreaChart
            ariaLabel={`Visitors per day, last ${days} days`}
            data={report.daily.map((d) => ({ label: SHORT_DATE(d.date), value: d.visitors }))}
            format={n}
            height={220}
          />
        </Panel>
        <Panel title="Page views per day">
          <AreaChart
            ariaLabel={`Page views per day, last ${days} days`}
            data={report.daily.map((d) => ({ label: SHORT_DATE(d.date), value: d.views }))}
            format={n}
            height={220}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="From visit to order"
          description="Where people drop off. Each step is a count of events, not of people."
        >
          <BarList format={n} rows={funnel} empty="Nothing yet." />
        </Panel>
        <Panel title="Most viewed products" description="With how many were added to the bag.">
          <BarList
            format={n}
            empty="No product views yet."
            rows={report.products.map((p) => ({
              label: names.has(p.productId) ? (
                <Link href={`/admin/products/${p.productId}`} className="hover:underline">
                  {names.get(p.productId)}
                </Link>
              ) : (
                'Removed product'
              ),
              value: p.views,
              note: `${p.cartAdds} added to bag`,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Where visitors come from" description="Which site or app sent them.">
          <Breakdown
            rows={report.referrers}
            label={(k) => WORDS.get(k) ?? k}
            empty="No visits yet."
          />
        </Panel>
        <Panel
          title="Campaigns"
          description="From links that carry utm_source (e.g. ?utm_source=instagram-bio)."
        >
          <Breakdown rows={report.campaigns} empty="No campaign links used yet." />
        </Panel>
        <Panel title="Top pages" description="Product pages are under Most viewed products.">
          <Breakdown
            rows={report.pages}
            label={(k) => PAGE_NAMES.get(k) ?? k}
            empty="No page views yet."
          />
        </Panel>
        <Panel title="Devices">
          {report.devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No visits yet.</p>
          ) : (
            <Donut
              format={n}
              parts={report.devices.map((d, i) => ({
                label: WORDS.get(d.key) ?? d.key,
                value: d.count,
                className:
                  ['stroke-primary', 'stroke-success', 'stroke-warning', 'stroke-danger'][i % 4] ??
                  'stroke-primary',
                dot: ['bg-primary', 'bg-success', 'bg-warning', 'bg-danger'][i % 4] ?? 'bg-primary',
              }))}
            />
          )}
        </Panel>
        <Panel title="Browsers and systems">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Browser</p>
          <Breakdown
            rows={report.browsers}
            label={(k) => WORDS.get(k) ?? k}
            empty="No visits yet."
          />
          <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            System
          </p>
          <Breakdown
            rows={report.systems}
            label={(k) => WORDS.get(k) ?? k}
            empty="No visits yet."
          />
        </Panel>
        <Panel
          title="Countries"
          description="Only when the hosting reports it; otherwise shown as Unknown."
        >
          <Breakdown rows={report.countries} label={countryName} empty="No visits yet." />
        </Panel>
      </div>

      <Panel title="Busiest hours" description="Page views by hour of the day, Sri Lanka time.">
        <AreaChart
          ariaLabel="Page views by hour of the day"
          data={report.hours.map((v, h) => ({ label: hourLabel(h), value: v }))}
          format={n}
          height={200}
        />
      </Panel>
    </div>
  );
}
