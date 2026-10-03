'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

/**
 * A row of products you can swipe or step through with the arrows. Works without JavaScript
 * (it is just a scrollable row); the arrows are an extra for mouse users.
 */
export function ProductRail({ label, children }: { label: string; children: React.ReactNode[] }) {
  const row = useRef<HTMLUListElement>(null);
  const step = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <ul
        ref={row}
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin] motion-reduce:scroll-auto"
      >
        {children.map((child, i) => (
          <li key={i} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%]">
            {child}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous products"
        className="absolute top-1/3 -left-3 hidden size-10 items-center justify-center rounded-full bg-text text-bg shadow-md lg:flex"
      >
        <ChevronLeft aria-hidden size={20} />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next products"
        className="absolute top-1/3 -right-3 hidden size-10 items-center justify-center rounded-full bg-text text-bg shadow-md lg:flex"
      >
        <ChevronRight aria-hidden size={20} />
      </button>
    </div>
  );
}
