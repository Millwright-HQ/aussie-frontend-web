'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';
import type { ActionState } from '@/app/admin/(panel)/actions';
import { Alert, Avatar, Button } from '@/app/admin/_ui';

const SIZE = 160;
const MAX_CHARS = 38_000; // the API accepts up to 40,000

/** Crops to a centred square and shrinks it until it is small enough to keep on the profile. */
async function toAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  for (const [size, quality] of [
    [SIZE, 0.85],
    [SIZE, 0.7],
    [128, 0.7],
    [96, 0.7],
  ] as const) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error('That picture is too detailed to shrink. Try a simpler one.');
}

export function AvatarForm({
  name,
  current,
  action,
}: {
  name: string;
  current?: string | undefined;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const shown = preview ?? current;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} {...(shown ? { src: shown } : {})} size={80} />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Choose a profile picture"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setProblem(undefined);
              try {
                setPreview(await toAvatar(file));
              } catch (err) {
                setProblem(err instanceof Error ? err.message : 'Could not read that picture.');
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Camera aria-hidden size={14} /> {shown ? 'Change picture' : 'Add a picture'}
          </Button>
          {current && !preview && (
            <form action={formAction}>
              <input type="hidden" name="remove" value="1" />
              <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                <Trash2 aria-hidden size={14} /> Remove
              </Button>
            </form>
          )}
        </div>
        <p className="text-xs text-muted">PNG, JPEG or WebP. It is cropped to a square and shrunk.</p>
        {preview && (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="avatar" value={preview} />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save picture'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(undefined)}>
              Cancel
            </Button>
          </form>
        )}
        {problem && <Alert className="mt-2">{problem}</Alert>}
        {state.error && <Alert className="mt-2">{state.error}</Alert>}
        {state.ok && <Alert tone="success" className="mt-2">{state.ok}</Alert>}
      </div>
    </div>
  );
}
