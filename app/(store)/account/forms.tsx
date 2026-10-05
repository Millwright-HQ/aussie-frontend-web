'use client';

import { Alert, Button, Checkbox, Field, Input, Select, Textarea, formatLkPhone } from '@aussie/ui';
import { CUSTOMER_PASSWORD_MIN, DISTRICTS } from '@aussie/validation';
import Link from 'next/link';
import { useActionState } from 'react';
import { NewPasswordPair } from '@/components/password-field';
import {
  changePasswordAction,
  deleteAddressAction,
  forgotPasswordAction,
  type FormState,
  resendCodeAction,
  resetPasswordAction,
  saveAddressAction,
  setDefaultAddressAction,
  signInAction,
  signUpAction,
  updateProfileAction,
  verifyEmailAction,
  welcomeAction,
} from './actions';

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

function useForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = new Map(Object.entries(state.fieldErrors ?? {}));
  const err = (k: string) => errors.get(k);
  return { state, formAction, pending, err };
}

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.ok}</Alert>}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 1 && (
        <Alert>Please fix the highlighted fields.</Alert>
      )}
    </>
  );
}

function Submit({
  pending,
  children,
  className,
}: {
  pending: boolean;
  children: string;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" className={className ?? 'w-full'} disabled={pending}>
      {pending ? 'Please wait…' : children}
    </Button>
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────

export function SignInForm({ next }: { next?: string }) {
  const { state, formAction, pending } = useForm(signInAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          autoFocus
        />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right text-sm">
        <Link
          href="/account/forgot-password"
          className="text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Submit pending={pending}>Sign in</Submit>
    </form>
  );
}

export function SignUpForm() {
  const { state, formAction, pending, err } = useForm(signUpAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <Field id="name" label="Full name" error={err('name')}>
        <Input
          id="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          invalid={!!err('name')}
          autoFocus
        />
      </Field>
      <Field id="email" label="Email" error={err('email')}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          invalid={!!err('email')}
        />
      </Field>
      <NewPasswordPair
        single
        idPrefix="signup"
        minLength={CUSTOMER_PASSWORD_MIN}
        passwordLabel="Password"
        errors={state.fieldErrors}
      />
      <Checkbox id="marketingOptIn" label="Send me offers and new arrivals (optional)" />
      <div>
        <Checkbox
          id="acceptTerms"
          required
          label={
            <>
              I agree to the{' '}
              <Link href="/terms" className="text-primary underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
            </>
          }
        />
        {err('acceptTerms') && <p className="mt-1 text-sm text-danger">{err('acceptTerms')}</p>}
      </div>
      <Submit pending={pending}>Create account</Submit>
    </form>
  );
}

export function VerifyEmailForm() {
  const { state, formAction, pending, err } = useForm(verifyEmailAction);
  const [resent, resend, resending] = useActionState(resendCodeAction, {});
  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5" noValidate>
        <Messages state={state} />
        <Field id="code" label="6-digit code" error={err('code')}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            invalid={!!err('code')}
            autoFocus
          />
        </Field>
        <Submit pending={pending}>Verify email</Submit>
      </form>
      <form action={resend} className="text-center text-sm">
        {resent.ok && <p className="mb-2 text-success">{resent.ok}</p>}
        {resent.error && <p className="mb-2 text-danger">{resent.error}</p>}
        <button
          type="submit"
          disabled={resending}
          className="text-primary underline-offset-4 hover:underline"
        >
          {resending ? 'Sending…' : "Didn't get it? Send a new code"}
        </button>
      </form>
    </div>
  );
}

export function ForgotPasswordForm() {
  const { state, formAction, pending, err } = useForm(forgotPasswordAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <Field id="email" label="Email" error={err('email')}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          invalid={!!err('email')}
          autoFocus
        />
      </Field>
      <Submit pending={pending}>Send reset code</Submit>
    </form>
  );
}

export function ResetPasswordForm() {
  const { state, formAction, pending, err } = useForm(resetPasswordAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <Field id="code" label="6-digit code" error={err('code')}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          invalid={!!err('code')}
          autoFocus
        />
      </Field>
      <NewPasswordPair
        single
        idPrefix="reset"
        minLength={CUSTOMER_PASSWORD_MIN}
        errors={state.fieldErrors}
      />
      <Submit pending={pending}>Set new password</Submit>
    </form>
  );
}

// ── Profile & addresses ─────────────────────────────────────────────────────

export interface ProfileView {
  name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  marketingOptIn: boolean;
}

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const { state, formAction, pending, err } = useForm(updateProfileAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={err('name')}>
          <Input
            id="name"
            autoComplete="name"
            defaultValue={profile.name}
            required
            invalid={!!err('name')}
          />
        </Field>
        <Field id="email" label="Email" hint="Contact us to change your email.">
          <Input id="email" type="email" defaultValue={profile.email} disabled hasHint />
        </Field>
        <Field
          id="phone"
          label="Mobile"
          hint="For delivery calls, e.g. 077 123 4567"
          error={err('phone')}
          optional
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={profile.phone ? formatLkPhone(profile.phone) : ''}
            invalid={!!err('phone')}
            hasHint
          />
        </Field>
        <Field id="birthday" label="Birthday" error={err('birthday')} optional>
          <Input
            id="birthday"
            type="date"
            defaultValue={profile.birthday ?? ''}
            invalid={!!err('birthday')}
          />
        </Field>
      </div>
      <Checkbox
        id="marketingOptIn"
        defaultChecked={profile.marketingOptIn}
        label="Send me offers and new arrivals"
      />
      <Submit pending={pending} className="w-full sm:w-auto">
        Save profile
      </Submit>
    </form>
  );
}

export interface AddressView {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode?: string;
  notes?: string;
  isDefault: boolean;
}

interface DistrictChoice {
  code: string;
  name: string;
  province: string;
}

function AddressFields({
  a,
  err,
  prefix,
  districts,
}: {
  a?: Partial<AddressView>;
  err: (k: string) => string | undefined;
  prefix: string;
  /** Districts we deliver to (switched on). Defaults to all, for forms that do not know. */
  districts?: DistrictChoice[] | undefined;
}) {
  const choices: DistrictChoice[] = districts ?? DISTRICTS.map((d) => ({ ...d }));
  const provinces = [...new Set(choices.map((d) => d.province))];
  const id = (k: string) => `${prefix}-${k}`;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id={id('fullName')} label="Recipient name" error={err('fullName')}>
        <Input
          id={id('fullName')}
          name="fullName"
          autoComplete="name"
          defaultValue={a?.fullName}
          required
          invalid={!!err('fullName')}
        />
      </Field>
      <Field id={id('phone')} label="Mobile" hint="e.g. 077 123 4567" error={err('phone')}>
        <Input
          id={id('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={a?.phone ? formatLkPhone(a.phone) : ''}
          required
          invalid={!!err('phone')}
          hasHint
        />
      </Field>
      <Field id={id('line1')} label="Address line 1" error={err('line1')} className="sm:col-span-2">
        <Input
          id={id('line1')}
          name="line1"
          autoComplete="address-line1"
          defaultValue={a?.line1}
          required
          invalid={!!err('line1')}
        />
      </Field>
      <Field
        id={id('line2')}
        label="Address line 2"
        error={err('line2')}
        optional
        className="sm:col-span-2"
      >
        <Input id={id('line2')} name="line2" autoComplete="address-line2" defaultValue={a?.line2} />
      </Field>
      <Field id={id('city')} label="City / town" error={err('city')}>
        <Input
          id={id('city')}
          name="city"
          autoComplete="address-level2"
          defaultValue={a?.city}
          required
          invalid={!!err('city')}
        />
      </Field>
      <Field id={id('district')} label="District" error={err('district')}>
        <Select
          id={id('district')}
          name="district"
          defaultValue={a?.district ?? ''}
          required
          invalid={!!err('district')}
        >
          <option value="" disabled>
            Choose a district
          </option>
          {provinces.map((p) => (
            <optgroup key={p} label={`${p} Province`}>
              {choices.filter((d) => d.province === p).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field id={id('postalCode')} label="Postal code" error={err('postalCode')} optional>
        <Input
          id={id('postalCode')}
          name="postalCode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          defaultValue={a?.postalCode}
          invalid={!!err('postalCode')}
        />
      </Field>
      <Field
        id={id('notes')}
        label="Delivery notes"
        error={err('notes')}
        optional
        className="sm:col-span-2"
      >
        <Textarea
          id={id('notes')}
          name="notes"
          rows={2}
          maxLength={300}
          defaultValue={a?.notes}
          placeholder="Landmark, gate colour, best time to call"
        />
      </Field>
    </div>
  );
}

export function AddressForm({
  address,
  onSavedLabel,
  districts,
}: {
  address?: AddressView;
  onSavedLabel?: string;
  districts?: DistrictChoice[];
}) {
  const { state, formAction, pending, err } = useForm(saveAddressAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      {address && <input type="hidden" name="id" value={address.id} />}
      <AddressFields a={address} err={err} prefix={address?.id ?? 'new'} districts={districts} />
      <Submit pending={pending} className="w-full sm:w-auto">
        {onSavedLabel ?? (address ? 'Save address' : 'Add address')}
      </Submit>
    </form>
  );
}

export function WelcomeForm({
  next,
  name,
  districts,
}: {
  next: string;
  name: string;
  districts?: DistrictChoice[];
}) {
  const { state, formAction, pending, err } = useForm(welcomeAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <input type="hidden" name="next" value={next} />
      <AddressFields a={{ fullName: name }} err={err} prefix="welcome" districts={districts} />
      <Submit pending={pending}>Save delivery details</Submit>
    </form>
  );
}

export function AddressActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [defState, setDefault, settingDefault] = useActionState(setDefaultAddressAction, {});
  const [delState, remove, removing] = useActionState(deleteAddressAction, {});
  const error = defState.error ?? delState.error;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isDefault && (
        <form action={setDefault}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline" size="sm" disabled={settingDefault}>
            Make default
          </Button>
        </form>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-danger">Remove…</summary>
        <form action={remove} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="danger" size="sm" disabled={removing}>
            Remove this address
          </Button>
        </form>
      </details>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const { state, formAction, pending } = useForm(changePasswordAction);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Messages state={state} />
      <Field id="current" label="Current password">
        <Input id="current" type="password" autoComplete="current-password" required />
      </Field>
      <NewPasswordPair
        idPrefix="change"
        minLength={CUSTOMER_PASSWORD_MIN}
        confirmLabel="Confirm new password"
        errors={state.fieldErrors}
      />
      <Submit pending={pending} className="w-full sm:w-auto">
        Change password
      </Submit>
    </form>
  );
}
