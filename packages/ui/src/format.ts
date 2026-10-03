/** Formats integer cents as `Rs 2,450.00` (docs/DESIGN_GUIDELINES.md §11). */
export function formatLkr(cents: number): string {
  const amount = new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `Rs ${amount}`;
}

/** `+94771234567` → `077 123 4567`. Returns input unchanged if not an E.164 LK mobile. */
export function formatLkPhone(e164: string): string {
  const m = /^\+94(7\d)(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}
