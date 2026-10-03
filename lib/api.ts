import 'server-only';
import type { ProblemDetails } from '@aussie/shared-types';
import type { Audience } from './auth/config';
import { getSession } from './auth/session';

/** Base URL of the API Gateway (Floci locally, AWS in dev/prod). Set via NEXT_PUBLIC_API_URL. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type HealthStatus =
  | { ok: true; service: string }
  | { ok: false; reason: 'not-configured' | 'unreachable' | 'error'; status?: number };

/** Server-side health probe for one service. Never throws; never cached. */
export async function getServiceHealth(service: string): Promise<HealthStatus> {
  if (!API_URL) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${API_URL}/v1/${service}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: 'error', status: res.status };
    const body = (await res.json()) as { service?: string };
    return { ok: true, service: body.service ?? service };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Partial<ProblemDetails>,
  ) {
    super(problem.detail ?? problem.title ?? `API error ${status}`);
  }

  /** First human-readable message for forms. */
  get userMessage(): string {
    const fromList = this.problem.errors?.[0]?.message;
    return (fromList ?? this.problem.detail ?? 'Something went wrong. Please try again.').replace(
      /^[\w.]+: /,
      '',
    );
  }
}

/**
 * Calls the API as the signed-in user (server-side only; the token never reaches the browser).
 * Throws ApiError for non-2xx responses.
 */
export async function api<T>(
  audience: Audience,
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const session = await getSession(audience);
  if (!session) throw new ApiError(401, { title: 'Unauthorized' });
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers: {
      ...init.headers,
      authorization: `Bearer ${session.accessToken}`,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, (data ?? {}) as Partial<ProblemDetails>);
  return data as T;
}
