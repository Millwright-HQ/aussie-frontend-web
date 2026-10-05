'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmButton } from '@/app/admin/_ui';
import { deleteProductAction } from '../catalog/actions';

/** Permanently removes a product that is not on the store. Asks first. */
export function DeleteProduct({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ConfirmButton
        variant="danger-soft"
        size="md"
        title={`Delete “${name}”?`}
        description="Removes the product, its variants, its stock records and all its images. This cannot be undone."
        confirmLabel="Delete product"
        onConfirm={async () => {
          const r = await deleteProductAction(productId);
          if (r.error) setError(r.error);
          else router.push('/admin/products');
        }}
      >
        <Trash2 aria-hidden size={15} /> Delete product
      </ConfirmButton>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
