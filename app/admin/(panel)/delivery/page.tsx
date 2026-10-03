import type { DeliveryChange, DeliveryConfig, DeliveryZone } from '@aussie/shared-types';
import { Alert, Card, Field, Input, Select } from '@aussie/ui';
import { DISTRICTS } from '@aussie/validation';
import { can, formatDateTime, requirePermission } from '@/lib/admin';
import { api } from '@/lib/api';
import { ActionForm } from '../action-form';
import {
  assignDistrictsAction,
  deleteZoneAction,
  previewQuoteAction,
  saveBandsAction,
  saveSettingsAction,
  saveZoneAction,
} from './actions';
import { BandsEditor } from './bands-editor';

export const metadata = { title: 'Delivery' };

type View = DeliveryConfig & { changes: DeliveryChange[] };

const rupees = (cents: number) => (cents / 100).toFixed(2);
const rs = (cents: number) =>
  `Rs ${(cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

function SettingsCard({ view, canVerify }: { view: View; canVerify: boolean }) {
  const s = view.settings;
  return (
    <Card>
      <h2 className="text-h3">Settings</h2>
      <ActionForm action={saveSettingsAction} submitLabel="Save settings" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="codFee" label="COD fee (Rs)" hint="Added to every order">
            <Input
              id="codFee"
              name="codFee"
              inputMode="decimal"
              defaultValue={rupees(s.codFeeCents)}
              required
              hasHint
            />
          </Field>
          <Field id="freeFrom" label="Free delivery from (Rs)" hint="0 = never free">
            <Input
              id="freeFrom"
              name="freeFrom"
              inputMode="decimal"
              defaultValue={rupees(s.freeDeliveryThresholdCents)}
              hasHint
            />
          </Field>
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showCodFeeSeparately"
            defaultChecked={s.showCodFeeSeparately}
            className="size-4 accent-primary"
          />
          Show the COD fee as its own line (otherwise it is folded into delivery)
        </label>
        {canVerify ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
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
        <h3 className="text-h3">{zone.name}</h3>
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
        <ActionForm
          action={deleteZoneAction}
          submitLabel="Delete this empty zone"
          variant="danger"
          size="sm"
          className="mt-3"
        >
          <input type="hidden" name="id" value={zone.id} />
        </ActionForm>
      )}
    </Card>
  );
}

export default async function DeliveryPage() {
  const me = await requirePermission('delivery:read');
  const view = await api<View>('admin', '/v1/delivery/admin/config');
  const canWrite = can(me, 'delivery:write');
  const canVerify = can(me, 'settings:write');
  const zoneOf = new Map(view.districts.map((d) => [d.code, d.zoneId]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Delivery</h1>
        <p className="mt-1 text-sm text-muted">
          Fees are worked out on the server from the parcel’s weight (or size, if higher), the
          district’s zone and the settings below. Changes apply to new checkouts only.
        </p>
      </div>

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
          <h2 className="text-h3">Settings</h2>
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

      <section aria-labelledby="zones" className="space-y-4">
        <h2 id="zones" className="text-h2">
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
            <h3 className="text-h3">Add a zone</h3>
            <ActionForm action={saveZoneAction} submitLabel="Add zone" size="sm" className="mt-4">
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

      <Card>
        <h2 className="text-h3">Districts</h2>
        <p className="mt-1 text-sm text-muted">Each district belongs to exactly one zone.</p>
        {canWrite ? (
          <ActionForm action={assignDistrictsAction} submitLabel="Save districts" className="mt-4">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {DISTRICTS.map((d) => (
                <div key={d.code} className="flex items-center justify-between gap-3">
                  <label htmlFor={`d-${d.code}`} className="text-sm">
                    {d.name} <span className="text-xs text-muted">{d.province}</span>
                  </label>
                  <Select
                    id={`d-${d.code}`}
                    name={`district-${d.code}`}
                    defaultValue={zoneOf.get(d.code)}
                    className="w-40"
                  >
                    {view.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </ActionForm>
        ) : (
          <p className="mt-3 text-sm text-muted">You can view but not change districts.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-h3">Try the rates</h2>
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
            <Field id="pq-weight" label="Weight (g)">
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
        <h2 className="text-h3">Recent changes</h2>
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
