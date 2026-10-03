import { describe, expect, it } from 'vitest';
import {
  bandsInputSchema,
  deliverySettingsSchema,
  districtAssignmentsSchema,
  quoteRequestSchema,
  zoneInputSchema,
} from './index.js';

const ULID = '01M3YEF9JM6SB09BZ34JP2A1XW';

describe('bandsInputSchema', () => {
  const bands = (...b: [number, number][]) => ({
    bands: b.map(([maxWeightG, feeCents]) => ({ maxWeightG, feeCents })),
  });
  it('accepts strictly ascending weights', () => {
    expect(bandsInputSchema.safeParse(bands([250, 35000], [500, 43000])).success).toBe(true);
  });
  it('rejects empty, equal, descending, negative-fee and fractional input', () => {
    expect(bandsInputSchema.safeParse({ bands: [] }).success).toBe(false);
    expect(bandsInputSchema.safeParse(bands([500, 1], [500, 2])).success).toBe(false);
    expect(bandsInputSchema.safeParse(bands([500, 1], [250, 2])).success).toBe(false);
    expect(bandsInputSchema.safeParse(bands([500, -1])).success).toBe(false);
    expect(bandsInputSchema.safeParse(bands([500.5, 100])).success).toBe(false);
  });
  it('caps the number of bands', () => {
    const many = {
      bands: Array.from({ length: 31 }, (_, i) => ({ maxWeightG: i + 1, feeCents: 1 })),
    };
    expect(bandsInputSchema.safeParse(many).success).toBe(false);
  });
});

describe('zoneInputSchema', () => {
  it('needs both delivery days or neither, in order', () => {
    expect(zoneInputSchema.safeParse({ name: 'Colombo', perExtraKgCents: 0 }).success).toBe(true);
    expect(
      zoneInputSchema.safeParse({ name: 'Colombo', perExtraKgCents: 0, minDays: 1, maxDays: 2 })
        .success,
    ).toBe(true);
    expect(
      zoneInputSchema.safeParse({ name: 'Colombo', perExtraKgCents: 0, minDays: 1 }).success,
    ).toBe(false);
    expect(
      zoneInputSchema.safeParse({ name: 'Colombo', perExtraKgCents: 0, minDays: 5, maxDays: 2 })
        .success,
    ).toBe(false);
  });
  it('treats empty day fields as not provided', () => {
    const z = zoneInputSchema.parse({
      name: 'Colombo',
      perExtraKgCents: 0,
      minDays: '',
      maxDays: '',
    });
    expect(z.minDays).toBeUndefined();
  });
});

describe('deliverySettingsSchema', () => {
  const ok = {
    codFeeCents: 0,
    freeDeliveryThresholdCents: 0,
    maxWeightG: 20000,
    packagingWeightG: 0,
    volumetricDivisor: 5000,
    showCodFeeSeparately: true,
    isVerified: false,
  };
  it('accepts a valid settings object and rejects unknown or out-of-range fields', () => {
    expect(deliverySettingsSchema.safeParse(ok).success).toBe(true);
    expect(deliverySettingsSchema.safeParse({ ...ok, role: 'x' }).success).toBe(false);
    expect(deliverySettingsSchema.safeParse({ ...ok, volumetricDivisor: 10 }).success).toBe(false);
    expect(deliverySettingsSchema.safeParse({ ...ok, codFeeCents: -1 }).success).toBe(false);
    expect(deliverySettingsSchema.safeParse({ ...ok, codFeeCents: Number.NaN }).success).toBe(
      false,
    );
  });
});

describe('districtAssignmentsSchema', () => {
  it('rejects duplicates and unknown districts', () => {
    expect(
      districtAssignmentsSchema.safeParse({ assignments: [{ code: 'CMB', zoneId: ULID }] }).success,
    ).toBe(true);
    expect(
      districtAssignmentsSchema.safeParse({
        assignments: [
          { code: 'CMB', zoneId: ULID },
          { code: 'CMB', zoneId: ULID },
        ],
      }).success,
    ).toBe(false);
    expect(
      districtAssignmentsSchema.safeParse({ assignments: [{ code: 'XXX', zoneId: ULID }] }).success,
    ).toBe(false);
  });
});

describe('quoteRequestSchema', () => {
  const base = { district: 'CMB', subtotalCents: 0, items: [{ weightG: 100, qty: 1 }] };
  it('limits items, quantities and dimensions', () => {
    expect(quoteRequestSchema.safeParse(base).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(
      quoteRequestSchema.safeParse({
        ...base,
        items: Array.from({ length: 51 }, () => ({ weightG: 1, qty: 1 })),
      }).success,
    ).toBe(false);
    expect(
      quoteRequestSchema.safeParse({ ...base, items: [{ weightG: 1, qty: 100 }] }).success,
    ).toBe(false);
    expect(
      quoteRequestSchema.safeParse({
        ...base,
        items: [{ weightG: 1, qty: 1, lengthCm: 10, widthCm: 10 }],
      }).success,
    ).toBe(false);
    expect(
      quoteRequestSchema.safeParse({
        ...base,
        items: [{ weightG: 1, qty: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }],
      }).success,
    ).toBe(true);
  });
});
