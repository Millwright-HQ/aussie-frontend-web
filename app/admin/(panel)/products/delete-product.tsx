'use client';

import { Button, Card } from '@aussie/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteProductAction } from '../catalog/actions';

export function DeleteProduct({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-sm text-danger">Delete this product…</summary>
        <p className="mt-2 text-sm text-muted">
          Removes the product, its variants and all its images. This cannot be undone.
        </p>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await deleteProductAction(productId);
              if (r.error) setError(r.error);
              else router.push('/admin/products');
            })
          }
        >
          Delete “{name}”
        </Button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </details>
    </Card>
  );
}
