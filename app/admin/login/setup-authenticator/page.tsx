import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { readFlow } from '@/lib/auth/session';
import { confirmAuthenticator } from '../actions';
import { AuthCard } from '../auth-card';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Set up your authenticator' };

export default async function SetupAuthenticatorPage() {
  const flow = await readFlow('admin');
  if (flow?.step !== 'mfa-setup' || !flow.totpSecret) redirect('/admin/login');

  // Standard otpauth URI understood by Google Authenticator, Microsoft Authenticator, Authy, 1Password.
  const label = encodeURIComponent(`Aussie Cosmetics Admin:${flow.email ?? 'admin'}`);
  const uri = `otpauth://totp/${label}?secret=${flow.totpSecret}&issuer=${encodeURIComponent('Aussie Cosmetics Admin')}`;
  // Rendered server-side as a data URL (allowed by our CSP img-src); the secret never hits a third party.
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
  const grouped = flow.totpSecret.match(/.{1,4}/g)?.join(' ') ?? flow.totpSecret;

  return (
    <AuthCard
      title="Set up two-step sign-in"
      subtitle="Admins must use an authenticator app. Scan the code, then enter the 6 digits it shows."
    >
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
        <img
          src={qr}
          alt="QR code for your authenticator app"
          width={200}
          height={200}
          className="rounded-[10px] bg-white p-2"
        />
        <details className="w-full text-sm">
          <summary className="cursor-pointer text-muted">
            Can't scan? Enter this key instead
          </summary>
          <code className="mt-2 block rounded-[10px] bg-bg px-3 py-2 font-mono text-xs break-all tabular">
            {grouped}
          </code>
        </details>
      </div>
      <AuthForm
        action={confirmAuthenticator}
        submitLabel="Verify and finish"
        fields={[
          {
            id: 'code',
            label: '6-digit code',
            inputMode: 'numeric',
            autoComplete: 'one-time-code',
            pattern: '[0-9]{6}',
            maxLength: 6,
          },
        ]}
      />
    </AuthCard>
  );
}
