import { Alert, Card, Field, Input } from '@aussie/ui';
import Link from 'next/link';
import QRCode from 'qrcode';
import { currentAdmin } from '@/lib/admin';
import { beginTotpEnrolment, totpEnabled } from '@/lib/auth/cognito';
import { requireAdminSession, safeNext } from '@/lib/auth/session';
import { ActionForm } from '../action-form';
import { disableAuthenticator, enableAuthenticator } from './actions';

export const metadata = { title: 'Security' };

type Search = {
  welcome?: string;
  setup?: string;
  enabled?: string;
  disabled?: string;
  next?: string;
};

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const [session, me] = await Promise.all([requireAdminSession(), currentAdmin()]);
  const enabled = await totpEnabled(session.accessToken);
  const next = safeNext(q.next, '/admin', '/admin');
  const setup = !enabled && q.setup === '1';

  // A new secret is issued each time the setup screen opens; it only counts once a code is confirmed.
  let qr = '';
  let grouped = '';
  if (setup) {
    const secret = await beginTotpEnrolment(session.accessToken);
    const issuer = 'Aussie Cosmetics Admin';
    const uri = `otpauth://totp/${encodeURIComponent(`${issuer}:${me.email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    qr = await QRCode.toDataURL(uri, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
    grouped = secret.match(/.{1,4}/g)?.join(' ') ?? secret;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-h1">Security</h1>
        <p className="mt-1 text-muted">Your sign-in options for {me.email}.</p>
      </div>

      {q.welcome === '1' && !enabled && !setup && (
        <Alert tone="info">
          Welcome! You can add a second step to your sign-in with an authenticator app. It is your
          choice: set it up now, or skip and do it later from this page.
          <span className="mt-3 flex flex-wrap gap-4 font-medium">
            <Link href={`/admin/security?setup=1&next=${encodeURIComponent(next)}`}>
              Set up now
            </Link>
            <Link href={next}>Skip for now</Link>
          </span>
        </Alert>
      )}
      {q.enabled === '1' && <Alert tone="success">Authenticator app is on.</Alert>}
      {q.disabled === '1' && <Alert tone="success">Authenticator app is off.</Alert>}

      <Card>
        <h2 className="text-h3">Authenticator app</h2>
        <p className="mt-1 text-sm text-muted">
          {enabled
            ? 'On. You will be asked for a 6-digit code each time you sign in.'
            : 'Off. Turning it on protects your account if your password is stolen.'}
        </p>

        {enabled && (
          <ActionForm
            action={disableAuthenticator}
            submitLabel="Turn off authenticator"
            variant="danger"
            size="sm"
            className="mt-4"
          />
        )}

        {!enabled && !setup && (
          <Link
            href="/admin/security?setup=1"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Set up authenticator app
          </Link>
        )}

        {setup && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
              <img
                src={qr}
                alt="QR code for your authenticator app"
                width={200}
                height={200}
                className="rounded-sm bg-white p-2"
              />
              <details className="w-full text-sm">
                <summary className="cursor-pointer text-muted">
                  Can&apos;t scan? Enter this key instead
                </summary>
                <code className="mt-2 block rounded-sm bg-bg px-3 py-2 font-mono text-xs break-all tabular">
                  {grouped}
                </code>
              </details>
            </div>
            <ActionForm action={enableAuthenticator} submitLabel="Verify and turn on">
              <input type="hidden" name="next" value={q.welcome === '1' ? next : ''} />
              <Field id="totp-code" label="6-digit code from your app">
                <Input
                  id="totp-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </Field>
            </ActionForm>
            <Link href="/admin/security" className="text-sm text-muted underline">
              Cancel
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
