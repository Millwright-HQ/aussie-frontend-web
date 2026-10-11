'use client';

import type { ProductImage, Variant } from '@aussie/shared-types';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import { Alert, Button, Card, ConfirmButton, IconButton, Input, Select } from '@/app/admin/_ui';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { imageUrl } from '@/lib/media';
import {
  deleteImageAction,
  reorderImagesAction,
  requestImageUpload,
  updateImageAction,
} from '../catalog/actions';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const variantLabel = (v: Variant) => v.options.map((o) => o.value).join(' · ') || v.sku;

export function MediaManager({
  productId,
  images,
  variants,
}: {
  productId: string;
  images: ProductImage[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    tone: 'danger' | 'success' | 'info';
    text: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const processing = images.some((i) => i.status === 'PENDING');

  // While the processor works, refresh until every image is READY or FAILED.
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [processing, router]);

  async function uploadFiles(files: File[]) {
    setMessage(null);
    const problems: string[] = [];
    for (const file of files) {
      setUploading((u) => [...u, file.name]);
      try {
        const ticket = await requestImageUpload(productId, file.type, file.size);
        if (!ticket.upload) {
          problems.push(`${file.name}: ${ticket.error ?? 'rejected'}`);
          continue;
        }
        const form = new FormData();
        for (const [k, v] of Object.entries(ticket.upload.fields)) form.append(k, v);
        form.append('file', file);
        const res = await fetch(ticket.upload.url, { method: 'POST', body: form });
        if (!res.ok) problems.push(`${file.name}: upload failed (${res.status})`);
      } catch {
        problems.push(`${file.name}: upload failed`);
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
    setMessage(
      problems.length
        ? { tone: 'danger', text: problems.join(' · ') }
        : { tone: 'info', text: 'Uploaded. Images appear once processed (a few seconds).' },
    );
    router.refresh();
  }

  function run(action: () => Promise<{ ok?: string; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setMessage(r.error ? { tone: 'danger', text: r.error } : null);
      router.refresh();
    });
  }

  const move = (index: number, delta: number) => {
    const ids = images.map((i) => i.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(index + delta, 0, moved);
    run(() => reorderImagesAction(productId, ids));
  };

  const coverId =
    images.find((i) => i.status === 'READY' && !i.variantId)?.id ??
    images.find((i) => i.status === 'READY')?.id;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Images</h2>
        <p className="text-xs text-muted">
          JPEG, PNG, WebP or AVIF up to 10 MB · at least 200 × 200 px · first product image is the
          cover
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
        className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
      >
        <p className="text-muted">Drag images here, or</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInput.current?.click()}
          disabled={uploading.length > 0}
        >
          <ImagePlus aria-hidden size={14} />
          {uploading.length ? `Uploading ${uploading.length}…` : 'Choose files'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          aria-label="Choose image files"
          onChange={(e) => {
            void uploadFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      </div>

      {message && (
        <Alert tone={message.tone} className="mt-4">
          {message.text}
        </Alert>
      )}

      {images.length > 0 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-muted">
                {img.status === 'READY' ? (
                  <Image
                    src={imageUrl(img.base)}
                    alt={img.alt}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm">
                    {img.status === 'PENDING' ? (
                      <span className="text-muted">Processing…</span>
                    ) : (
                      <span className="text-danger">Failed: {img.error ?? 'unknown error'}</span>
                    )}
                  </div>
                )}
                {img.id === coverId && (
                  <span className="absolute top-2 left-2 rounded-full bg-text/80 px-2 py-0.5 text-xs text-bg">
                    Cover
                  </span>
                )}
              </div>
              <ImageDetails
                productId={productId}
                image={img}
                variants={variants}
                disabled={pending}
              />
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <IconButton
                  label="Move earlier"
                  disabled={pending || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronLeft aria-hidden size={16} />
                </IconButton>
                <IconButton
                  label="Move later"
                  disabled={pending || i === images.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronRight aria-hidden size={16} />
                </IconButton>
                <span className="ml-auto">
                  <ConfirmButton
                    iconOnly
                    label="Delete image"
                    title="Delete this image?"
                    description="It is removed from the product and from the store. This cannot be undone."
                    confirmLabel="Delete image"
                    disabled={pending}
                    onConfirm={() => run(() => deleteImageAction(productId, img.id))}
                  >
                    <Trash2 aria-hidden size={16} />
                  </ConfirmButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ImageDetails({
  productId,
  image,
  variants,
  disabled,
}: {
  productId: string;
  image: ProductImage;
  variants: Variant[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [alt, setAlt] = useState(image.alt);
  const [variantId, setVariantId] = useState(image.variantId ?? '');
  const [state, setState] = useState<{ ok?: string; error?: string }>({});
  const [saving, startTransition] = useTransition();
  const dirty = alt !== image.alt || variantId !== (image.variantId ?? '');

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-medium" htmlFor={`alt-${image.id}`}>
        Alt text
      </label>
      <Input
        id={`alt-${image.id}`}
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        className="h-9 text-sm"
      />
      {variants.length > 1 && (
        <>
          <label className="block text-xs font-medium" htmlFor={`var-${image.id}`}>
            Shows for
          </label>
          <Select
            id={`var-${image.id}`}
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="h-9 text-sm"
          >
            <option value="">All variants</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {variantLabel(v)}
              </option>
            ))}
          </Select>
        </>
      )}
      {dirty && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || saving}
          onClick={() =>
            startTransition(async () => {
              const r = await updateImageAction(productId, image.id, alt, variantId || null);
              setState(r);
              router.refresh();
            })
          }
        >
          {saving ? 'Saving…' : 'Save image details'}
        </Button>
      )}
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}
