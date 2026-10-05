import { KeyRound, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { currentAdmin } from '@/lib/admin';
import { api } from '@/lib/api';
import { safeNext } from '@/lib/auth/session';
import { ActionForm } from '../action-form';
import {
  changePasswordAction,
  disableAuthenticator,
  enableAuthenticator,
  saveAvatarAction,
  saveEmailAction,
  saveNameAction,
} from './actions';
import { AvatarForm } from './avatar-form';
import { PasswordForm } from './password-form';
import {
  Alert,
  Avatar,
  Badge,
  Field,
  Input,
  PageHeader,
  Panel,
  SectionTabs,
} from '@/app/admin/_ui';

export const metadata = { title: 'My profile' };

const TABS = ['profile', 'password', 'security'] as const;
type Tab = (typeof TABS)[number];

type Search = {
  tab?: string;
  welcome?: string;
  setup?: string;
  enabled?: string;
  disabled?: string;
  next?: string;
};

const roleName = (id: string) =>
  id
    .replace(/^custom-.*/, 'Custom role')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Search> }) {
  const [q, me] = await Promise.all([searchParams, currentAdmin()]);
  const tab: Tab = TABS.find((t) => t === q.tab) ?? 'profile';
  const enabled = me.totpEnabled === true;
  const next = safeNext(q.next, '/admin', '/admin');
  const setup = tab === 'security' && !enabled && q.setup === '1';

  // A new secret is issued each time the setup screen opens; it only counts once a code is confirmed.
  let qr = '';
  let grouped = '';
  if (setup) {
    const begun = await api<{ secret: string; uri: string }>(
      'admin',
      '/v1/identity/admin/me/authenticator/begin',
      { method: 'POST' },
    );
    qr = await QRCode.toDataURL(begun.uri, { margin: 1, width: 220, errorCorrectionLevel: 'M' });
    grouped = begun.secret.match(/.{1,4}/g)?.join(' ') ?? begun.secret;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar name={me.name} {...(me.avatar ? { src: me.avatar } : {})} size={56} />
            <span>
              {me.name}
              <span className="block text-sm font-normal text-muted">
                {me.email} · {roleName(me.roleId)}
              </span>
            </span>
          </span>
        }
      />
      <SectionTabs
        current={`/admin/profile${tab === 'profile' ? '' : `?tab=${tab}`}`}
        items={[
          { href: '/admin/profile', label: 'Profile' },
          { href: '/admin/profile?tab=password', label: 'Password' },
          { href: '/admin/profile?tab=security', label: 'Security' },
        ]}
      />

      {tab === 'profile' && (
        <div className="space-y-6">
          <Panel
            title="Picture"
            description="Shown next to your name in the menu and the audit log."
          >
            <AvatarForm name={me.name} current={me.avatar} action={saveAvatarAction} />
          </Panel>
          <Panel title="Name">
            <ActionForm action={saveNameAction} submitLabel="Save name" className="max-w-md">
              <Field id="name" label="Full name">
                <Input
                  id="name"
                  name="name"
                  defaultValue={me.name}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </Field>
            </ActionForm>
          </Panel>
          <Panel
            title="Email"
            description="You sign in with this address. Changing it needs your current password."
          >
            <ActionForm action={saveEmailAction} submitLabel="Change email" className="max-w-md">
              <Field id="email" label="Email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={me.email}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field id="currentPassword" label="Current password">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
            </ActionForm>
          </Panel>
        </div>
      )}

      {tab === 'password' && (
        <Panel
          title="Change password"
          description="Use something long that you do not use anywhere else."
          className="max-w-xl"
        >
          <PasswordForm action={changePasswordAction} />
        </Panel>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          {q.welcome === '1' && !enabled && !setup && (
            <Alert tone="info">
              Welcome! You can add a second step to your sign-in with an authenticator app. It is
              your choice: set it up now, or skip and do it later from this page.
              <span className="mt-3 flex flex-wrap gap-4 font-medium">
                <Link href={`/admin/profile?tab=security&setup=1&next=${encodeURIComponent(next)}`}>
                  Set up now
                </Link>
                <Link href={next}>Skip for now</Link>
              </span>
            </Alert>
          )}
          {q.enabled === '1' && <Alert tone="success">Authenticator app is on.</Alert>}
          {q.disabled === '1' && <Alert tone="success">Authenticator app is off.</Alert>}

          <Panel
            title="Authenticator app"
            description="A second step when you sign in: after your password you enter a 6-digit code from an app on your phone."
            actions={
              enabled ? (
                <Badge tone="success">
                  <ShieldCheck aria-hidden size={11} /> On
                </Badge>
              ) : (
                <Badge>
                  <ShieldOff aria-hidden size={11} /> Off
                </Badge>
              )
            }
          >
            {enabled ? (
              <div className="space-y-4">
                <p className="flex items-start gap-2 text-sm">
                  <Smartphone aria-hidden size={16} className="mt-0.5 shrink-0 text-muted" />
                  You will be asked for a 6-digit code every time you sign in. To turn it off, enter
                  a current code from your app, so a stolen session cannot remove it.
                </p>
                <ActionForm
                  action={disableAuthenticator}
                  submitLabel="Turn off authenticator"
                  variant="danger"
                  size="sm"
                  className="max-w-sm"
                >
                  <Field id="disable-code" label="Current 6-digit code">
                    <Input
                      id="disable-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </Field>
                </ActionForm>
              </div>
            ) : !setup ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Off. Turning it on protects your account if your password is ever stolen. Works
                  with Google Authenticator, Microsoft Authenticator, Authy and 1Password.
                </p>
                <Link
                  href="/admin/profile?tab=security&setup=1"
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-fg shadow-sm hover:bg-primary/90"
                >
                  <KeyRound aria-hidden size={15} /> Set up authenticator app
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
                  <img
                    src={qr}
                    alt="QR code for your authenticator app"
                    width={220}
                    height={220}
                    className="rounded-xl bg-white p-2"
                  />
                  <details className="w-56 text-sm">
                    <summary className="cursor-pointer text-muted">
                      Can&apos;t scan? Enter this key
                    </summary>
                    <code className="mt-2 block rounded-[10px] bg-surface-muted px-3 py-2 font-mono text-xs break-all tabular">
                      {grouped}
                    </code>
                  </details>
                </div>
                <div className="space-y-4">
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
                    <li>Open your authenticator app and add an account.</li>
                    <li>Scan the QR code (or type the key).</li>
                    <li>Enter the 6-digit code the app shows below.</li>
                  </ol>
                  <ActionForm
                    action={enableAuthenticator}
                    submitLabel="Verify and turn on"
                    className="max-w-sm"
                  >
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
                        autoFocus
                      />
                    </Field>
                  </ActionForm>
                  <Link href="/admin/profile?tab=security" className="text-sm text-muted underline">
                    Cancel
                  </Link>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
