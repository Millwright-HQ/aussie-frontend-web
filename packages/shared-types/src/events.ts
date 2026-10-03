/** Envelope for EventBridge domain events (detail payload). */
export interface DomainEvent<TType extends string = string, TData = unknown> {
  id: string;
  type: TType;
  source: `aussie.${string}`;
  occurredAt: string;
  correlationId?: string;
  data: TData;
}
