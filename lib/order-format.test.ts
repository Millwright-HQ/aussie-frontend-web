import { describe, expect, it } from 'vitest';
import { buildTimeline, statusHint, statusLabel, statusTone } from './order-format';

const at = (h: number) => `2026-10-03T0${h}:00:00.000Z`;

describe('buildTimeline', () => {
  it('shows every stage, marking where the order is now', () => {
    const steps = buildTimeline({
      status: 'SHIPPED',
      history: [
        { at: at(1), to: 'PENDING' },
        { at: at(2), to: 'CONFIRMED' },
        { at: at(3), to: 'PACKED' },
        { at: at(4), to: 'SHIPPED', publicNote: 'Handed to Domex' },
      ],
    });
    expect(steps.map((s) => [s.status, s.state])).toEqual([
      ['PENDING', 'done'],
      ['CONFIRMED', 'done'],
      ['PACKED', 'done'],
      ['SHIPPED', 'current'],
      ['OUT_FOR_DELIVERY', 'todo'],
      ['DELIVERED', 'todo'],
    ]);
    expect(steps[3]).toMatchObject({ at: at(4), note: 'Handed to Domex' });
    expect(steps[4]?.at).toBeUndefined();
  });

  it('counts a skipped stage as passed, without a time', () => {
    const steps = buildTimeline({
      status: 'DELIVERED',
      history: [
        { at: at(1), to: 'PENDING' },
        { at: at(2), to: 'CONFIRMED' },
        { at: at(3), to: 'PACKED' },
        { at: at(4), to: 'SHIPPED' },
        { at: at(5), to: 'DELIVERED' },
      ],
    });
    const skipped = steps.find((s) => s.status === 'OUT_FOR_DELIVERY');
    expect(skipped).toMatchObject({ state: 'done' });
    expect(skipped?.at).toBeUndefined();
    expect(steps.at(-1)).toMatchObject({ status: 'DELIVERED', state: 'current' });
  });

  it('ends at the outcome for a cancelled order and drops the stages it never reached', () => {
    const steps = buildTimeline({
      status: 'CANCELLED',
      history: [
        { at: at(1), to: 'PENDING' },
        { at: at(2), to: 'CANCELLED', publicNote: 'No payment slip in time' },
      ],
    });
    expect(steps.map((s) => s.status)).toEqual(['PENDING', 'CANCELLED']);
    expect(steps[1]).toMatchObject({ state: 'current', note: 'No payment slip in time' });
  });

  it('keeps the whole journey for a returned order', () => {
    const steps = buildTimeline({
      status: 'RETURNED',
      history: [
        { at: at(1), to: 'PENDING' },
        { at: at(2), to: 'CONFIRMED' },
        { at: at(3), to: 'PACKED' },
        { at: at(4), to: 'SHIPPED' },
        { at: at(5), to: 'RETURNED' },
      ],
    });
    expect(steps.map((s) => s.status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PACKED',
      'SHIPPED',
      'RETURNED',
    ]);
  });
});

describe('wording for the out-for-delivery stage', () => {
  it('has a label, a hint that depends on how the customer pays, and a tone', () => {
    expect(statusLabel('OUT_FOR_DELIVERY')).toBe('Out for delivery');
    expect(statusHint('OUT_FOR_DELIVERY')).toMatch(/cash/i);
    expect(statusHint('OUT_FOR_DELIVERY', 'BANK_TRANSFER')).not.toMatch(/cash/i);
    expect(statusTone('OUT_FOR_DELIVERY')).toBe(statusTone('SHIPPED'));
  });
});
