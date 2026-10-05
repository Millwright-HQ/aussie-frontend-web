'use server';

import {
  bandsInputSchema,
  deliverySettingsSchema,
  districtAssignmentsSchema,
  districtFeesSchema,
  DISTRICTS,
  quoteRequestSchema,
  ulidSchema,
  zoneInputSchema,
} from '@aussie/validation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { describeQuote, getQuote } from '@/lib/delivery';
import type { ActionState } from '@/app/admin/(panel)/actions';

/** "2,450.50" → 245050; empty → NaN (rejected by the schema with a friendly message). */
const cents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '')
    .replace(/,/g, '')
    .trim();
  return s === '' ? Number.NaN : Math.round(Number(s) * 100);
};
const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? Number.NaN : Number(s);
};
const optionalInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? undefined : Number(s);
};

async function call(fn: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return { error: err.userMessage };
    throw err;
  }
  revalidatePath('/admin/site/delivery');
  return { ok };
}

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = deliverySettingsSchema.safeParse({
    mode: form.get('mode'),
    codFeeCents: cents(form.get('codFee')),
    freeDeliveryThresholdCents: cents(form.get('freeFrom') || '0'),
    maxWeightG: int(form.get('maxWeightG')),
    packagingWeightG: int(form.get('packagingWeightG') || '0'),
    volumetricDivisor: int(form.get('volumetricDivisor')),
    showCodFeeSeparately: form.get('showCodFeeSeparately') === 'on',
    isVerified: form.get('isVerified') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return call(
    () => api('admin', '/v1/delivery/admin/settings', { method: 'PUT', body: parsed.data }),
    'Settings saved.',
  );
}

export async function saveZoneAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id') ?? '');
  if (id && !ulidSchema.safeParse(id).success) return { error: 'Invalid zone' };
  const parsed = zoneInputSchema.safeParse({
    name: form.get('name'),
    perExtraKgCents: cents(form.get('perExtraKg')),
    minDays: optionalInt(form.get('minDays')),
    maxDays: optionalInt(form.get('maxDays')),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form' };
  return call(
    () =>
      api('admin', id ? `/v1/delivery/admin/zones/${id}` : '/v1/delivery/admin/zones', {
        method: id ? 'PUT' : 'POST',
        body: parsed.data,
      }),
    id ? 'Zone saved.' : 'Zone added. Now add its weight bands and assign districts.',
  );
}

export async function deleteZoneAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id') ?? '');
  if (!ulidSchema.safeParse(id).success) return { error: 'Invalid zone' };
  return call(
    () => api('admin', `/v1/delivery/admin/zones/${id}`, { method: 'DELETE' }),
    'Zone deleted.',
  );
}

export async function saveBandsAction(
  zoneId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!ulidSchema.safeParse(zoneId).success) return { error: 'Invalid zone' };
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('bands') ?? '[]'));
  } catch {
    return { error: 'Could not read the bands. Please try again.' };
  }
  const parsed = bandsInputSchema.safeParse({ bands: raw });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const row = typeof first?.path[1] === 'number' ? `Row ${first.path[1] + 1}: ` : '';
    return { error: `${row}${first?.message ?? 'Check the bands'}` };
  }
  return call(
    () =>
      api('admin', `/v1/delivery/admin/zones/${zoneId}/bands`, {
        method: 'PUT',
        body: parsed.data,
      }),
    'Weight bands saved.',
  );
}

/**
 * Saves every district row at once: switched on/off, fixed price, and zone. The zone only moves
 * when it really changed (the service ignores unchanged ones).
 */
export async function saveDistrictsAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const fees = districtFeesSchema.safeParse({
    districts: DISTRICTS.map((d) => ({
      code: d.code,
      enabled: form.get(`on-${d.code}`) === 'on',
      fixedFeeCents: cents(form.get(`fee-${d.code}`) || '0'),
    })),
  });
  if (!fees.success) {
    const idx = fees.error.issues[0]?.path[1];
    const name = typeof idx === 'number' ? DISTRICTS.at(idx)?.name : undefined;
    return {
      error: `${name ? `${name}: ` : ''}enter the price in rupees, for example 400 or 400.00`,
    };
  }
  const zones = districtAssignmentsSchema.safeParse({
    assignments: DISTRICTS.map((d) => ({ code: d.code, zoneId: form.get(`district-${d.code}`) })),
  });
  if (!zones.success) return { error: 'Choose a zone for every district' };
  return call(async () => {
    await api('admin', '/v1/delivery/admin/districts/fees', { method: 'PUT', body: fees.data });
    await api('admin', '/v1/delivery/admin/districts', { method: 'PUT', body: zones.data });
  }, 'Districts saved.');
}

/** Try the rate card: the same quote shoppers get, for a made-up parcel. */
export async function previewQuoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const dims = ['lengthCm', 'widthCm', 'heightCm'].map((k) => optionalInt(form.get(k)));
  const parsed = quoteRequestSchema.safeParse({
    district: form.get('district'),
    subtotalCents: cents(form.get('subtotal') || '0'),
    items: [
      {
        weightG: int(form.get('weightG')),
        qty: int(form.get('qty') || '1'),
        ...(dims.every((d) => d !== undefined)
          ? { lengthCm: dims[0], widthCm: dims[1], heightCm: dims[2] }
          : {}),
      },
    ],
  });
  if (!parsed.success) {
    return {
      error:
        'Choose a district and enter the weight in grams (size is optional, but give all three or none)',
    };
  }
  const result = await getQuote(parsed.data);
  if (!result.ok) return { error: result.message };
  const { quote } = result;
  return {
    ok: `${describeQuote(quote)} · ${
      quote.mode === 'FIXED'
        ? `fixed price for ${quote.zone.name}`
        : `zone ${quote.zone.name} · charged for ${quote.chargeableWeightG} g`
    }`,
  };
}
