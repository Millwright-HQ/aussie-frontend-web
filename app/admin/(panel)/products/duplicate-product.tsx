'use client';

import { Button } from '@aussie/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { duplicateProductAction } from '../catalog/actions';

/** Starts a new draft from this product, handy for items that differ only slightly. */
export function DuplicateProduct({ productId }: { productId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await duplicateProductAction(productId);
            if (r.id) router.push(`/admin/products/${r.id}`);
            else setError(r.error ?? 'Could not copy it');
          })
        }
      >
        {pending ? 'Copying…' : 'Duplicate as a new draft'}
      </Button>
      <span className="text-xs text-muted">
        Copies the details and variants. Pictures are not copied.
      </span>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
