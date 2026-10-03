import { getServiceHealth } from '@/lib/api';

const MESSAGES = {
  'not-configured': 'API URL not set (run pnpm local:deploy)',
  unreachable: 'unreachable',
  error: 'error',
} as const;

/** Non-prod diagnostic: shows whether the web app can reach the backend services. */
export async function BackendStatus() {
  if (process.env.NEXT_PUBLIC_ENV_NAME === 'prod') return null;
  const identity = await getServiceHealth('identity');
  return (
    <p className="mt-6 text-center text-xs text-muted" role="status">
      Backend (identity):{' '}
      {identity.ok ? (
        <span className="font-medium text-success">connected</span>
      ) : (
        <span className="font-medium text-danger">
          {MESSAGES[identity.reason]}
          {identity.status ? ` (${identity.status})` : ''}
        </span>
      )}
    </p>
  );
}
