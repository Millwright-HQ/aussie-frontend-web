/** RFC 9457 problem details returned by every service on error. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  errors?: Array<{ path: string; message: string }>;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
