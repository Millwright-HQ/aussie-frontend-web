import type { DeliveryChange, DeliveryConfig, DeliveryZone } from '@aussie/shared-types';
import { Trash2 } from 'lucide-react';
import { Alert, Card, ConfirmAction, Field, Input, PageHeader, Select } from '@/app/admin/_ui';
import { DISTRICTS } from '@aussie/validation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import {
  saveDistrictsAction,
  deleteZoneAction,
  previewQuoteAction,
  saveBandsAction,
  saveSettingsAction,
  saveZoneAction,
} from './actions';
import { BandsEditor } from './bands-editor';
import { SiteTabs } from '../tabs';

export const metadata = { title: 'Delivery configuration' };

type View = DeliveryConfig & { changes: DeliveryChange[] };

const rupees = (cents: number) => (cents / 100).toFixed(2);
const rs = (cents: number) =>
  `Rs ${(cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

function SettingsCard({ view, canVerify }: { view: View; canVerify: boolean }) {
  const s = view.settings;
  const modes = [
    {
      value: 'FIXED',
      title: 'Fixed price per district',
      text: 'Each district has its own delivery price (set in the table below). Weight and size are ignored.',
    },
    {
      value: 'WEIGHT',
      title: 'By weight and zone',
      text: 'The price comes from the parcel’s weight (or size) and the district’s zone, using weight bands. Kept ready for when you sign a courier contract.',
    },
  ] as const;
  return (
    <Card>
      <h2 className="text-[15px] font-semibold">How delivery is priced</h2>
      <p className="mt-1 text-sm text-muted">
        Only one is used at a time. Switching does not delete the other one’s prices.
      </p>
      <ActionForm action={saveSettingsAction} submitLabel="Save settings" className="mt-4">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Pricing method</legend>
          {modes.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="mode"
                value={m.value}
                defaultChecked={s.mode === m.value}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">{m.title}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{m.text}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="codFee" label="COD fee (Rs)" hint="Added to every cash-on-delivery order">
            <Input
              id="codFee"
              name="codFee"
              inputMode="decimal"
              defaultValue={rupees(s.codFeeCents)}
              required
              hasHint
            />
          </Field>
          <Field
            id="freeFrom"
            label="Free delivery from (Rs)"
            hint="0 = never free. Works in both methods"
          >
            <Input
              id="freeFrom"
              name="freeFrom"
              inputMode="decimal"
              defaultValue={rupees(s.freeDeliveryThresholdCents)}
              hasHint
            />
          </Field>
        </div>

        <details open={s.mode === 'WEIGHT'} className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Weight settings{' '}
            <span className="font-normal text-muted">
              ({s.mode === 'WEIGHT' ? 'in use' : 'not used while the price is fixed'})
            </span>
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              id="maxWeightG"
              label="Heaviest order (g)"
              hint="Above this, checkout says “contact us”"
            >
              <Input
                id="maxWeightG"
                name="maxWeightG"
                inputMode="numeric"
                defaultValue={s.maxWeightG}
                required
                hasHint
              />
            </Field>
            <Field id="packagingWeightG" label="Packaging weight (g)" hint="Added to every parcel">
              <Input
                id="packagingWeightG"
                name="packagingWeightG"
                inputMode="numeric"
                defaultValue={s.packagingWeightG}
                hasHint
              />
            </Field>
            <Field
              id="volumetricDivisor"
              label="Volumetric divisor"
              hint="Size weight (kg) = L × W × H in cm ÷ this. 5000 is a common figure: ask your courier"
            >
              <Input
                id="volumetricDivisor"
                name="volumetricDivisor"
                inputMode="numeric"
                defaultValue={s.volumetricDivisor}
                required
                hasHint
              />
            </Field>
          </div>
        </details>

        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showCodFeeSeparately"
            defaultChecked={s.showCodFeeSeparately}
            className="size-4 accent-primary"
          />
          Show the COD fee as its own line (otherwise it is folded into delivery)
        </label>
        {canVerify ? (
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isVerified"
              defaultChecked={s.isVerified}
              className="size-4 accent-primary"
            />
            Mark these rates as verified against a courier contract
          </label>
        ) : (
          <>
            <input type="hidden" name="isVerified" value={s.isVerified ? 'on' : 'off'} />
            <p className="text-sm text-muted">
              Rates are {s.isVerified ? 'marked verified' : 'unverified'}. Only a Super Admin can
              change this.
            </p>
          </>
        )}
      </ActionForm>
    </Card>
  );
}

/** Every district: offered at checkout or not, its fixed price, and its zone (delivery days / weight rates). */
function DistrictsCard({ view, canWrite }: { view: View; canWrite: boolean }) {
  const fixed = view.settings.mode === 'FIXED';
  const byCode = new Map(view.districts.map((d) => [d.code, d]));
  const on = view.districts.filter((d) => d.enabled).length;
  return (
    <Card>
      <h2 className="text-[15px] font-semibold">Districts</h2>
      <p className="mt-1 text-sm text-muted">
        {on} of {DISTRICTS.length} switched on. A district that is switched off does not appear in
        any district list, and orders to it are refused.{' '}
        {fixed
          ? 'The price is what the customer pays for delivery to that district.'
          : 'Prices below are kept for the fixed-price method; the weight bands are used right now.'}
      </p>
      {canWrite ? (
        <ActionForm action={saveDistrictsAction} submitLabel="Save districts" className="mt-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/60 text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-2.5">On</th>
                  <th className="px-4 py-2.5">District</th>
                  <th className="px-4 py-2.5">Price (Rs){fixed ? '' : ' (not used now)'}</th>
                  <th className="px-4 py-2.5">Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DISTRICTS.map((d) => {
                  const row = byCode.get(d.code);
                  return (
                    <tr
                      key={d.code}
                      className={row?.enabled === false ? 'bg-surface-muted/40' : undefined}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          id={`on-${d.code}`}
                          name={`on-${d.code}`}
                          defaultChecked={row?.enabled !== false}
                          aria-label={`Deliver to ${d.name}`}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <label htmlFor={`on-${d.code}`} className="font-medium">
                          {d.name}
                        </label>{' '}
                        <span className="text-xs text-muted">{d.province}</span>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          id={`fee-${d.code}`}
                          name={`fee-${d.code}`}
                          inputMode="decimal"
                          aria-label={`Price for ${d.name}`}
                          defaultValue={rupees(row?.fixedFeeCents ?? 0)}
                          className="h-9 w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          id={`district-${d.code}`}
                          name={`district-${d.code}`}
                          aria-label={`Zone for ${d.name}`}
                          defaultValue={row?.zoneId}
                          className="h-9 w-44"
                        >
                          {view.zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionForm>
      ) : (
        <p className="mt-3 text-sm text-muted">You can view but not change districts.</p>
      )}
    </Card>
  );
}

function ZoneCard({
  zone,
  canWrite,
  districtCount,
}: {
  zone: DeliveryZone;
  canWrite: boolean;
  districtCount: number;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{zone.name}</h3>
        <p className="text-sm text-muted">
          {districtCount} district{districtCount === 1 ? '' : 's'}
          {zone.minDays !== undefined && ` · ${zone.minDays}–${zone.maxDays} days`}
        </p>
      </div>
      {canWrite ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <ActionForm action={saveZoneAction} submitLabel="Save zone" size="sm">
            <input type="hidden" name="id" value={zone.id} />
            <Field id={`zn-${zone.id}`} label="Name">
              <Input
                id={`zn-${zone.id}`}
                name="name"
                defaultValue={zone.name}
                required
                maxLength={60}
              />
            </Field>
            <Field id={`ze-${zone.id}`} label="Per extra kg above the last band (Rs)">
              <Input
                id={`ze-${zone.id}`}
                name="perExtraKg"
                inputMode="decimal"
                defaultValue={rupees(zone.perExtraKgCents)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id={`zmin-${zone.id}`} label="Fastest (days)" optional>
                <Input
                  id={`zmin-${zone.id}`}
                  name="minDays"
                  inputMode="numeric"
                  defaultValue={zone.minDays ?? ''}
                />
              </Field>
              <Field id={`zmax-${zone.id}`} label="Slowest (days)" optional>
                <Input
                  id={`zmax-${zone.id}`}
                  name="maxDays"
                  inputMode="numeric"
                  defaultValue={zone.maxDays ?? ''}
                />
              </Field>
            </div>
          </ActionForm>
          <ActionForm
            action={saveBandsAction.bind(null, zone.id)}
            submitLabel="Save weight bands"
            size="sm"
          >
            <BandsEditor zoneId={zone.id} bands={zone.bands} />
          </ActionForm>
        </div>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-border">
              <th className="py-2 font-medium">Up to</th>
              <th className="py-2 text-right font-medium">Fee</th>
            </tr>
          </thead>
          <tbody>
            {zone.bands.map((b) => (
              <tr key={b.maxWeightG} className="border-b border-border">
                <td className="py-2">{b.maxWeightG} g</td>
                <td className="py-2 text-right tabular">{rs(b.feeCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-sm text-muted">
        Above the last band: {rs(zone.perExtraKgCents)} per extra started kg.
      </p>
      {canWrite && districtCount === 0 && (
        <div className="mt-3">
          <ConfirmAction
            action={deleteZoneAction}
            fields={{ id: zone.id }}
            title={`Delete the ${zone.name} zone?`}
            description="The zone has no districts, so nothing else is affected."
            confirmLabel="Delete zone"
            variant="danger-soft"
          >
            <Trash2 aria-hidden size={14} /> Delete this empty zone
          </ConfirmAction>
        </div>
      )}
    </Card>
  );
}

export default async function DeliveryPage() {
  const me = await requirePermission('delivery:read');
  const view = await api<View>('admin', '/v1/delivery/admin/config');
  const canWrite = can(me, 'delivery:write');
  const canVerify = can(me, 'settings:write');

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Site settings"
        description="Delivery configuration: fees are worked out on the server from the parcel’s weight (or size, if higher), the district’s zone and the settings below. Changes apply to new checkouts only. To update an order’s delivery status, open the order."
      />
      <SiteTabs me={me} current="/admin/site/delivery" />

      {!view.settings.isVerified && (
        <Alert tone="warning">
          <strong>Unverified rates.</strong> The weight bands are placeholders based on a courier’s
          published 2025 card, and the COD fee and delivery days are not set. Enter your contracted
          rates, then {canVerify ? 'tick “verified”.' : 'ask a Super Admin to mark them verified.'}
        </Alert>
      )}

      {canWrite ? (
        <SettingsCard view={view} canVerify={canVerify} />
      ) : (
        <Card>
          <h2 className="text-[15px] font-semibold">Settings</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-muted">COD fee</dt>
            <dd>{rs(view.settings.codFeeCents)}</dd>
            <dt className="text-muted">Free delivery from</dt>
            <dd>
              {view.settings.freeDeliveryThresholdCents
                ? rs(view.settings.freeDeliveryThresholdCents)
                : 'Off'}
            </dd>
            <dt className="text-muted">Heaviest order</dt>
            <dd>{view.settings.maxWeightG} g</dd>
            <dt className="text-muted">Volumetric divisor</dt>
            <dd>{view.settings.volumetricDivisor}</dd>
          </dl>
        </Card>
      )}

      <DistrictsCard view={view} canWrite={canWrite} />

      <details
        open={view.settings.mode === 'WEIGHT'}
        className="group rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <summary className="cursor-pointer text-[15px] font-semibold">
          Weight bands and zones{' '}
          <span className="text-sm font-normal text-muted">
            (
            {view.settings.mode === 'WEIGHT'
              ? 'in use'
              : 'kept for later, not used while the price is fixed'}
            )
          </span>
        </summary>
        <div className="mt-4 space-y-6">
          <section aria-labelledby="zones" className="space-y-4">
            <h2 id="zones" className="text-lg font-semibold">
              Zones and weight bands
            </h2>
            {view.zones.map((z) => (
              <ZoneCard
                key={z.id}
                zone={z}
                canWrite={canWrite}
                districtCount={view.districts.filter((d) => d.zoneId === z.id).length}
              />
            ))}
            {canWrite && (
              <Card>
                <h3 className="text-[15px] font-semibold">Add a zone</h3>
                <ActionForm
                  action={saveZoneAction}
                  submitLabel="Add zone"
                  size="sm"
                  className="mt-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field id="nz-name" label="Name">
                      <Input id="nz-name" name="name" required maxLength={60} />
                    </Field>
                    <Field id="nz-extra" label="Per extra kg (Rs)">
                      <Input
                        id="nz-extra"
                        name="perExtraKg"
                        inputMode="decimal"
                        defaultValue="0.00"
                        required
                      />
                    </Field>
                    <Field id="nz-min" label="Fastest (days)" optional>
                      <Input id="nz-min" name="minDays" inputMode="numeric" />
                    </Field>
                    <Field id="nz-max" label="Slowest (days)" optional>
                      <Input id="nz-max" name="maxDays" inputMode="numeric" />
                    </Field>
                  </div>
                </ActionForm>
              </Card>
            )}
          </section>
        </div>
      </details>

      <Card>
        <h2 className="text-[15px] font-semibold">Try the rates</h2>
        <p className="mt-1 text-sm text-muted">
          The same calculation shoppers get, for a parcel you describe.
        </p>
        <ActionForm
          action={previewQuoteAction}
          submitLabel="Work out the fee"
          size="sm"
          className="mt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="pq-district" label="District">
              <Select id="pq-district" name="district" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {DISTRICTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="pq-weight" label="Weight (g)" hint="Ignored while the price is fixed">
              <Input id="pq-weight" name="weightG" inputMode="numeric" required />
            </Field>
            <Field id="pq-qty" label="Quantity">
              <Input id="pq-qty" name="qty" inputMode="numeric" defaultValue="1" />
            </Field>
            <Field id="pq-sub" label="Order subtotal (Rs)" optional>
              <Input id="pq-sub" name="subtotal" inputMode="decimal" defaultValue="0" />
            </Field>
            <Field id="pq-l" label="Length (cm)" optional>
              <Input id="pq-l" name="lengthCm" inputMode="numeric" />
            </Field>
            <Field id="pq-w" label="Width (cm)" optional>
              <Input id="pq-w" name="widthCm" inputMode="numeric" />
            </Field>
            <Field id="pq-h" label="Height (cm)" optional>
              <Input id="pq-h" name="heightCm" inputMode="numeric" />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-[15px] font-semibold">Recent changes</h2>
        {view.changes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No changes yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {view.changes.map((c) => (
              <li key={c.id} className="py-2">
                <span className="text-muted">
                  {formatDateTime(c.at)} · {c.actorName ?? 'Admin'}
                </span>
                <span className="block">{c.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
