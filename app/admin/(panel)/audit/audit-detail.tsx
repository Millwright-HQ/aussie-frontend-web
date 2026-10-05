'use client';

import type { AuditRecord } from '@aussie/shared-types';
import { Eye, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Badge, IconButton } from '@/app/admin/_ui';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) =>
  children === undefined || children === null || children === '' ? null : (
    <div className="grid gap-1 py-2 sm:grid-cols-[150px_1fr]">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );

const Json = ({ value }: { value: unknown }) =>
  value === undefined ? null : (
    <pre className="max-h-72 overflow-auto rounded-[10px] bg-surface-muted p-3 font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );

/**
 * Every detail of one trail entry in a dialog: who, from where, which request, with what input
 * (secrets are already hidden by the API), what came back, and before/after values.
 */
export function AuditDetail({
  record,
  title,
  who,
  when,
}: {
  record: AuditRecord;
  title: string;
  who: string;
  when: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <IconButton label={`Details: ${title}`} onClick={() => setOpen(true)}>
        <Eye aria-hidden size={16} />
      </IconButton>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-auto max-h-[88dvh] w-[min(44rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  {who} · {when}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-muted"
              >
                <X aria-hidden size={18} />
              </button>
            </header>
            <div className="max-h-[calc(88dvh-5rem)] overflow-y-auto px-6 py-3">
              <dl className="divide-y divide-border">
                <Row label="Result">
                  <Badge
                    tone={
                      record.outcome === 'success'
                        ? 'success'
                        : record.outcome === 'denied'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {record.outcome === 'success'
                      ? 'Worked'
                      : record.outcome === 'denied'
                        ? 'Not allowed'
                        : 'Failed'}
                  </Badge>
                  {record.status !== undefined && (
                    <span className="ml-2 text-muted">HTTP {record.status}</span>
                  )}
                  {record.durationMs !== undefined && record.durationMs > 0 && (
                    <span className="ml-2 text-muted">{record.durationMs} ms</span>
                  )}
                </Row>
                <Row label="Task">
                  <code className="font-mono text-xs">{record.action}</code>
                </Row>
                <Row label="Service">{record.service}</Row>
                <Row label="Kind">
                  {record.kind === 'view' ? 'Looked at something' : 'Changed something'}
                </Row>
                <Row label="Request">
                  {record.method && record.path ? (
                    <code className="font-mono text-xs">
                      {record.method} {record.path}
                    </code>
                  ) : undefined}
                </Row>
                <Row label="Target">
                  {record.targetId ? (
                    <>
                      {record.targetType && (
                        <span className="text-muted">{record.targetType}: </span>
                      )}
                      <code className="font-mono text-xs">{record.targetId}</code>
                    </>
                  ) : undefined}
                </Row>
                <Row label="Who">
                  {who}
                  {record.actorSub && (
                    <span className="block font-mono text-xs text-muted">{record.actorSub}</span>
                  )}
                </Row>
                <Row label="From">
                  {record.clientIp ?? record.ip}
                  {record.clientIp && record.ip && record.ip !== record.clientIp && (
                    <span className="block text-xs text-muted">seen by the API as {record.ip}</span>
                  )}
                </Row>
                <Row label="Browser">{record.userAgent}</Row>
                <Row label="Request id">
                  {record.requestId ? (
                    <code className="font-mono text-xs">{record.requestId}</code>
                  ) : undefined}
                </Row>
                <Row label="Entry id">
                  <code className="font-mono text-xs">{record.id}</code>
                </Row>
              </dl>
              {record.query && Object.keys(record.query).length > 0 && (
                <section className="mt-4">
                  <h3 className="mb-1.5 text-[13px] font-medium text-muted">
                    Search / filters used
                  </h3>
                  <Json value={record.query} />
                </section>
              )}
              {record.body !== undefined && (
                <section className="mt-4">
                  <h3 className="mb-1.5 text-[13px] font-medium text-muted">
                    What was sent (secrets hidden)
                  </h3>
                  <Json value={record.body} />
                </section>
              )}
              {record.before !== undefined && (
                <section className="mt-4">
                  <h3 className="mb-1.5 text-[13px] font-medium text-muted">Before</h3>
                  <Json value={record.before} />
                </section>
              )}
              {record.after !== undefined && (
                <section className="mt-4 mb-2">
                  <h3 className="mb-1.5 text-[13px] font-medium text-muted">After</h3>
                  <Json value={record.after} />
                </section>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
