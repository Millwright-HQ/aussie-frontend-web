import type { Order } from '@aussie/shared-types';
import { describe, expect, it } from 'vitest';
import { csvCell, ORDER_CSV_HEADERS, ordersToCsv } from './csv';

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(undefined)).toBe('');
  });

  it('defuses spreadsheet formulas', () => {
    for (const evil of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd']) {
      expect(csvCell(evil).replace(/^"/, '').startsWith("'")).toBe(true);
    }
    expect(csvCell('a=b')).toBe('a=b');
  });
});

describe('ordersToCsv', () => {
  const order = {
    id: 'x',
    orderNumber: 'AC-26-00042',
    status: 'DELIVERED',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'CONFIRMED',
    shipping: {
      fullName: '=cmd|evil',
      phone: '+94771234567',
      line1: '12, Galle Road',
      city: 'Colombo',
      district: 'CMB',
    },
    lines: [
      { productName: 'Ruby Lipstick', label: 'Ruby', qty: 2 },
      { productName: 'Phone X', label: '', qty: 1 },
    ],
    subtotalCents: 490_000,
    deliveryFeeCents: 43_000,
    codFeeCents: 0,
    totalCents: 533_000,
    createdAt: '2026-10-03T10:30:00.000Z',
    updatedAt: '2026-10-03T10:30:00.000Z',
  } as unknown as Order;

  it('has a header row and one row per order', () => {
    const lines = ordersToCsv([order]).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(ORDER_CSV_HEADERS.join(','));
  });

  it('writes money in rupees, the district by name, items and Sri Lanka time', () => {
    const row = ordersToCsv([order]).split('\r\n')[1] ?? '';
    expect(row).toContain('AC-26-00042');
    expect(row).toContain('4900.00');
    expect(row).toContain('5330.00');
    expect(row).toContain('Colombo');
    expect(row).toContain('Ruby Lipstick (Ruby) x2; Phone X x1');
    expect(row).toContain('2026-10-03 16:00'); // 10:30 UTC is 16:00 in Colombo
  });

  it('keeps a hostile customer name from becoming a formula', () => {
    expect(ordersToCsv([order])).toContain("'=cmd|evil");
  });

  it('is just the header when there are no orders', () => {
    expect(ordersToCsv([])).toBe(ORDER_CSV_HEADERS.join(','));
  });
});
