/** Delivery shapes (docs/DELIVERY_RATES.md). Money in cents, weight in grams, size in cm. */

export interface DeliverySettings {
  /** Flat cash-on-delivery handling fee added to every order. */
  codFeeCents: number;
  /** Orders at or above this subtotal get free delivery; 0 = off. */
  freeDeliveryThresholdCents: number;
  /** Heavier orders are refused online ("contact us"). */
  maxWeightG: number;
  /** Added to every parcel's weight. */
  packagingWeightG: number;
  /** Volumetric weight (kg) = L × W × H (cm³) ÷ divisor. Courier-specific; the default is a common industry figure, UNVERIFIED. */
  volumetricDivisor: number;
  showCodFeeSeparately: boolean;
  /** An admin confirmed the rates against a courier contract. */
  isVerified: boolean;
  updatedAt?: string;
}

export interface DeliveryBand {
  maxWeightG: number;
  feeCents: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  /** Charged per started kg above the last band. */
  perExtraKgCents: number;
  /** Estimated delivery time in days (both or neither). */
  minDays?: number;
  maxDays?: number;
  sortOrder: number;
  bands: DeliveryBand[];
}

export interface DeliveryDistrict {
  code: string;
  name: string;
  province: string;
  zoneId: string;
}

export interface DeliveryConfig {
  settings: DeliverySettings;
  zones: DeliveryZone[];
  districts: DeliveryDistrict[];
}

export interface DeliveryQuote {
  deliveryFeeCents: number;
  codFeeCents: number;
  /** deliveryFeeCents + codFeeCents. */
  totalFeeCents: number;
  /** True when the free-delivery threshold removed the delivery fee. */
  freeDelivery: boolean;
  chargeableWeightG: number;
  zone: { id: string; name: string };
  estimatedDays?: { min: number; max: number };
  showCodFeeSeparately: boolean;
}

export interface DeliveryChange {
  id: string;
  at: string;
  actor: string;
  actorName?: string;
  summary: string;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  codFeeCents: 0,
  freeDeliveryThresholdCents: 0,
  maxWeightG: 20_000,
  packagingWeightG: 0,
  volumetricDivisor: 5000,
  showCodFeeSeparately: true,
  isVerified: false,
};

/** Seed rate card: Domex's published island-wide card as reported in 2025. UNVERIFIED placeholders. */
export const SEED_BANDS: readonly DeliveryBand[] = [
  { maxWeightG: 250, feeCents: 35_000 },
  { maxWeightG: 500, feeCents: 43_000 },
  { maxWeightG: 1000, feeCents: 51_000 },
  { maxWeightG: 2000, feeCents: 59_000 },
  { maxWeightG: 3000, feeCents: 67_000 },
  { maxWeightG: 4000, feeCents: 75_000 },
  { maxWeightG: 5000, feeCents: 83_000 },
];
/** Assumed continuation of the pattern above 5 kg (NOT from the source). */
export const SEED_PER_EXTRA_KG_CENTS = 8_000;

export interface RatesChangedDetail {
  summary: string;
}
