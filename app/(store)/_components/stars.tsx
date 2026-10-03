/** Star rating. The stars are decorative; the text alternative carries the value. */
export function Stars({
  value,
  count,
  className = '',
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const label = `Rated ${value.toFixed(1)} out of 5${count === undefined ? '' : ` from ${count} review${count === 1 ? '' : 's'}`}`;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span
        role="img"
        aria-label={label}
        className="relative inline-block leading-none tracking-tight"
      >
        <span aria-hidden="true" className="text-border">
          ★★★★★
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 overflow-hidden text-accent"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      {count !== undefined && (
        <span className="text-muted tabular" aria-hidden="true">
          ({count})
        </span>
      )}
    </span>
  );
}
