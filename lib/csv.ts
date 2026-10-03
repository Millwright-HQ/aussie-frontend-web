import { DISTRICTS } from '@aussie/validation';
import type { Order } from '@aussie/shared-types';

/**
 * One CSV cell. Text starting with = + - @ (or a tab/CR) would run as a formula when the file is
 * opened in a spreadsheet, so it gets a leading apostrophe; quotes are doubled.
 */
export function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const rupees = (cents: number) => (cents / 100).toFixed(2);

const districtName = (code: string) => DISTRICTS.find((d) => d.code === code)?.name ?? code;

const colomboTime = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  })
    .format(new Date(iso))
    .replace(',', '');

export const ORDER_CSV_HEADERS = [
  'Order number',
  'Placed (Sri Lanka time)',
  'Status',
  'Payment method',
  'Payment status',
  'Customer',
  'Phone',
  'Email',
  'Address',
  'District',
  'Items',
  'Subtotal (LKR)',
  'Delivery (LKR)',
  'COD fee (LKR)',
  'Total (LKR)',
  'Courier',
  'Tracking number',
  'Cash collected (LKR)',
] as const;

/** Orders as CSV rows (header first), ready to open in a spreadsheet. */
export function ordersToCsv(orders: Order[]): string {
  const rows = orders.map((o) => [
    o.orderNumber,
    colomboTime(o.createdAt),
    o.status,
    o.paymentMethod ?? 'COD',
    o.paymentStatus ?? '',
    o.shipping.fullName,
    o.shipping.phone,
    o.email ?? '',
    [o.shipping.line1, o.shipping.line2, o.shipping.city].filter(Boolean).join(', '),
    districtName(o.shipping.district),
    o.lines.map((l) => `${l.productName}${l.label ? ` (${l.label})` : ''} x${l.qty}`).join('; '),
    rupees(o.subtotalCents),
    rupees(o.deliveryFeeCents),
    rupees(o.codFeeCents),
    rupees(o.totalCents),
    o.courier ?? '',
    o.trackingNo ?? '',
    o.codCollectedCents === undefined ? '' : rupees(o.codCollectedCents),
  ]);
  return [ORDER_CSV_HEADERS as readonly string[], ...rows]
    .map((r) => r.map((c) => csvCell(c)).join(','))
    .join('\r\n');
}
