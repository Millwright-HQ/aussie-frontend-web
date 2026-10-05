import { cn } from '@aussie/ui';
import type { ReactNode } from 'react';

/**
 * Small server-rendered SVG charts for the dashboard. No client JavaScript: values are also in a
 * visually hidden table / title text, so the numbers stay available to screen readers. Colours
 * are the token colours (via currentColor and Tailwind classes), so light and dark both work.
 */

const nice = (n: number) => {
  if (n <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(n));
  const f = n / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
};

export interface SeriesPoint {
  /** x label, e.g. "5 Oct". */
  label: string;
  value: number;
}

/** Area/line chart over a time series, with a few gridlines and first/middle/last x labels. */
export function AreaChart({
  data,
  format = (n) => String(n),
  height = 200,
  className,
  ariaLabel,
}: {
  data: SeriesPoint[];
  format?: (n: number) => string;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  const W = 640;
  const H = height;
  const pad = { l: 8, r: 8, t: 12, b: 24 };
  const max = nice(Math.max(1, ...data.map((d) => d.value)));
  const x = (i: number) =>
    pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelIdx =
    data.length > 2
      ? [0, Math.floor((data.length - 1) / 2), data.length - 1]
      : data.map((_, i) => i);
  const gid = `area-${ariaLabel.replace(/\W+/g, '')}`;
  return (
    <figure className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full overflow-visible text-primary"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeDasharray={t === 0 ? undefined : '3 4'}
            />
            <text x={pad.l} y={y(t) - 4} className="fill-muted text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}
        {data.length > 1 && <path d={area} fill={`url(#${gid})`} />}
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.value)}
            r={data.length > 40 ? 0 : 2.5}
            className="fill-surface stroke-current"
            strokeWidth="1.5"
          >
            <title>{`${d.label}: ${format(d.value)}`}</title>
          </circle>
        ))}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            className="fill-muted text-[10px]"
          >
            {data.at(i)?.label}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** Horizontal bars with labels and values: top products, orders by status, … */
export function BarList({
  rows,
  format = (n) => String(n),
  empty = 'Nothing to show yet.',
}: {
  rows: {
    label: ReactNode;
    value: number;
    note?: ReactNode;
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  }[];
  format?: (n: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const color = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-muted/60',
  } as const;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular">
              {format(r.value)}
              {r.note && <span className="ml-1.5 font-normal text-muted">{r.note}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn('h-full rounded-full', color[r.tone ?? 'primary'])}
              // width is data-driven; the CSP allows style attributes (style-src-attr)
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ring chart with a legend. */
export function Donut({
  parts,
  centre,
  format = (n) => String(n),
}: {
  parts: { label: string; value: number; className: string; dot: string }[];
  centre?: ReactNode;
  format?: (n: number) => string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="size-full -rotate-90"
          role="img"
          aria-label="Share by group"
        >
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="12"
            className="stroke-surface-muted"
          />
          {total > 0 &&
            parts.map((p) => {
              const len = (p.value / total) * C;
              const seg = (
                <circle
                  key={p.label}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth="12"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  className={p.className}
                >
                  <title>{`${p.label}: ${format(p.value)}`}</title>
                </circle>
              );
              offset += len;
              return seg;
            })}
        </svg>
        {centre && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centre}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', p.dot)} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular">
              {format(p.value)}
              {total > 0 && (
                <span className="ml-1.5 font-normal text-muted">
                  {Math.round((p.value / total) * 100)}%
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tiny inline trend line for stat tiles. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 28;
  const max = Math.max(1, ...values);
  const pts = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`,
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-7 w-24 text-primary', className)} aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
