import { INQUIRY_STATUS_LABELS, INQUIRY_STATUSES, type Inquiry } from '@aussie/shared-types';
import { Field, Select, Textarea } from '@/app/admin/_ui';
import { ActionForm } from '../action-form';
import { updateInquiryAction } from './actions';

const labels = new Map(Object.entries(INQUIRY_STATUS_LABELS));

/** Status and internal note for one message. */
export function InquiryUpdate({ inquiry: q }: { inquiry: Inquiry }) {
  return (
    <details className="mt-4 border-t border-border pt-3">
      <summary className="cursor-pointer text-sm font-medium">Update status</summary>
      <ActionForm action={updateInquiryAction} submitLabel="Save" size="sm" className="mt-3">
        <input type="hidden" name="id" value={q.id} />
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <Field id={`status-${q.id}`} label="Status">
            <Select id={`status-${q.id}`} name="status" defaultValue={q.status}>
              {INQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labels.get(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={`note-${q.id}`}
            label="Note"
            hint="For the team only, e.g. who you replied to and what you said"
            optional
          >
            <Textarea
              id={`note-${q.id}`}
              name="note"
              rows={2}
              defaultValue={q.note}
              maxLength={500}
            />
          </Field>
        </div>
      </ActionForm>
    </details>
  );
}
