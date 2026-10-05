'use client';

import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/app/admin/_ui';
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
        disabled={pending}
        title="Copies the details and variants. Pictures are not copied."
        onClick={() =>
          startTransition(async () => {
            const r = await duplicateProductAction(productId);
            if (r.id) router.push(`/admin/products/${r.id}`);
            else setError(r.error ?? 'Could not copy it');
          })
        }
      >
        <Copy aria-hidden size={15} />
        {pending ? 'Copying…' : 'Duplicate as draft'}
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
