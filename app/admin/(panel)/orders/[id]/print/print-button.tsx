'use client';

import { Button } from '@aussie/ui';

export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      Print
    </Button>
  );
}
