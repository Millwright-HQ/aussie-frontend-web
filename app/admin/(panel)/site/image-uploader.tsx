'use client';

import { Alert } from '@aussie/ui';
import { MAX_SITE_IMAGE_BYTES, SITE_IMAGE_TYPES } from '@aussie/validation';
import Image from 'next/image';
import { useState } from 'react';
import { requestSiteUploadAction } from './actions';

/**
 * Picks a picture, uploads it straight to storage and puts its path in a hidden field named
 * `name`, so the surrounding form saves it with everything else.
 */
export function ImageUploader({
  name,
  initialPath,
  label,
  previewUrlBase,
}: {
  name: string;
  initialPath?: string;
  label: string;
  /** Address the pictures are served from (the CDN). */
  previewUrlBase: string;
}) {
  const [path, setPath] = useState(initialPath ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError('Upload a JPG, PNG or WebP picture.');
      return;
    }
    if (file.size > MAX_SITE_IMAGE_BYTES) {
      setError('The picture must be 3 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      const ticket = await requestSiteUploadAction(file.type, file.size);
      if ('error' in ticket) {
        setError(ticket.error);
        return;
      }
      const form = new FormData();
      for (const [k, v] of Object.entries(ticket.upload.fields)) form.append(k, v);
      form.append('file', file);
      const res = await fetch(ticket.upload.url, { method: 'POST', body: form });
      if (!res.ok) {
        setError(`The upload failed (${res.status}). Please try again.`);
        return;
      }
      setPath(ticket.path);
    } catch {
      setError('The upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path} />
      <span className="block text-sm font-medium">{label}</span>
      {path && (
        <button
          type="button"
          onClick={() => setPath('')}
          className="block text-sm text-danger underline underline-offset-4"
        >
          Remove the picture
        </button>
      )}
      {path && (
        <div className="relative h-32 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface-muted">
          <Image
            unoptimized
            src={`${previewUrlBase}/${path}`}
            alt="Current picture"
            fill
            sizes="28rem"
            className="object-contain"
          />
        </div>
      )}
      <input
        type="file"
        accept={SITE_IMAGE_TYPES.join(',')}
        disabled={busy}
        aria-label={`${label}: choose a picture`}
        className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-border file:bg-surface file:px-4"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <p className="text-xs text-muted">JPG, PNG or WebP, up to 3 MB.</p>
      {busy && <p className="text-sm text-muted">Uploading…</p>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
