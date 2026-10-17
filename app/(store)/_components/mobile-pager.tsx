'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '@/components/reveal';

/**
 * A list that, below the `sm` breakpoint, shows one page of items at a time (two columns, so a
 * page of 4 is a 2x2 block) with previous/next arrow buttons. From `sm` up every item is shown and
 * the arrows disappear. Not a slider: the page only changes when an arrow is pressed.
 */
export function MobilePager({
  items,
  pageSize = 4,
  label,
  listClassName,
}: {
  items: { key: string; className?: string; node: React.ReactNode }[];
  pageSize?: number;
  /** Names the arrows for screen readers, e.g. "collections". */
  label: string;
  /** Classes for the `<ul>`; they apply at every width. */
  listClassName: string;
}) {
  const [page, setPage] = useState(0);
  const [touched, setTouched] = useState(false);
  const go = (n: number) => {
    setTouched(true);
    setPage(n);
  };
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);

  return (
    <Reveal variant="fade" className="relative">
      <Reveal as="ul" stagger className={listClassName}>
        {items.map((item, i) => (
          <li
            key={item.key}
            className={`${item.className ?? ''} ${
              Math.floor(i / pageSize) === current ? (touched ? 'pager-in' : '') : 'hidden sm:block'
            }`}
          >
            {item.node}
          </li>
        ))}
      </Reveal>
      {pages > 1 && (
        <>
          {current > 0 && (
            <PagerButton side="left" label={`Previous ${label}`} onClick={() => go(current - 1)}>
              <ChevronLeft aria-hidden size={20} />
            </PagerButton>
          )}
          {current < pages - 1 && (
            <PagerButton side="right" label={`Next ${label}`} onClick={() => go(current + 1)}>
              <ChevronRight aria-hidden size={20} />
            </PagerButton>
          )}
        </>
      )}
    </Reveal>
  );
}

function PagerButton({
  side,
  label,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/3 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md sm:hidden ${
        side === 'left' ? '-left-2' : '-right-2'
      }`}
    >
      {children}
    </button>
  );
}
