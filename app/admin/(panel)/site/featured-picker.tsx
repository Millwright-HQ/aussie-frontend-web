'use client';

import { MAX_FEATURED_TILES, type FeaturedTile } from '@aussie/shared-types';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Select } from '@/app/admin/_ui';
import { ImageUploader } from './image-uploader';

interface Row extends FeaturedTile {
  key: number;
}

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-sm border border-border bg-surface disabled:opacity-40';

/**
 * Chooses and orders the categories shown in the home page "Featured collection". The choice is
 * saved with the rest of the settings form as JSON in a hidden field named `featured`.
 */
export function FeaturedPicker({
  options,
  initial,
  previewUrlBase,
}: {
  options: { id: string; label: string }[];
  initial: FeaturedTile[];
  previewUrlBase: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((t, key) => ({ ...t, key })));
  const [next, setNext] = useState(initial.length);

  const update = (key: number, patch: Partial<FeaturedTile>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const copy = [...r];
      const [item] = copy.splice(i, 1);
      if (item) copy.splice(i + dir, 0, item);
      return copy;
    });

  const chosen = new Set(rows.map((r) => r.categoryId));
  const value = JSON.stringify(
    rows
      .filter((r) => r.categoryId)
      .map((r) => ({
        categoryId: r.categoryId,
        ...(r.imagePath ? { imagePath: r.imagePath } : {}),
      })),
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="featured" value={value} />
      {rows.length === 0 && (
        <p className="text-sm text-muted">
          Nothing chosen yet, so the shop shows every top-level category. Add categories to pick
          your own and set their order.
        </p>
      )}
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={row.key} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-sm text-muted">{i + 1}.</span>
              <div className="min-w-0 flex-1 basis-56">
                <Select
                  id={`featured-${row.key}`}
                  aria-label={`Featured category ${i + 1}`}
                  value={row.categoryId}
                  onChange={(e) => update(row.key, { categoryId: e.target.value })}
                >
                  <option value="">Choose a category…</option>
                  {options.map((o) => (
                    <option
                      key={o.id}
                      value={o.id}
                      disabled={chosen.has(o.id) && o.id !== row.categoryId}
                    >
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                className={iconButton}
                disabled={i === 0}
                aria-label="Move up"
                onClick={() => move(i, -1)}
              >
                <ArrowUp aria-hidden size={16} />
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={i === rows.length - 1}
                aria-label="Move down"
                onClick={() => move(i, 1)}
              >
                <ArrowDown aria-hidden size={16} />
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label="Remove from featured"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              >
                <Trash2 aria-hidden size={16} />
              </button>
            </div>
            <div className="mt-3 pl-8">
              <ImageUploader
                name={`featuredPicture-${row.key}`}
                label="Tile picture (optional; the category's own picture is used otherwise)"
                initialPath={row.imagePath}
                previewUrlBase={previewUrlBase}
                onChange={(path) => update(row.key, { imagePath: path || undefined })}
              />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={rows.length >= MAX_FEATURED_TILES}
        onClick={() => {
          setRows((r) => [...r, { key: next, categoryId: '' }]);
          setNext(next + 1);
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-medium disabled:opacity-40"
      >
        <Plus aria-hidden size={16} /> Add a category
      </button>
    </div>
  );
}
