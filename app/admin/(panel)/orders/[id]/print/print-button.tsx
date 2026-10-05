'use client';

import { Button } from '@/app/admin/_ui';

export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      Print
    </Button>
  );
}
