'use client';

import { useEffect, useRef } from 'react';

type Variant = 'up' | 'fade' | 'scale' | 'left' | 'right';

/**
 * Fades its content in as it scrolls into view (once). The motion lives in globals.css: hidden
 * only when scripting is on, so nothing is lost without JavaScript, and shown at once for people
 * who prefer reduced motion. With `stagger`, each direct child enters a beat after the one before.
 */
export function Reveal({
  as = 'div',
  variant = 'up',
  delay = 0,
  stagger = false,
  className,
  children,
}: {
  as?: 'div' | 'ul' | 'ol' | 'section' | 'p' | 'h2';
  variant?: Variant;
  /** Milliseconds to wait once visible. */
  delay?: number;
  stagger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.setAttribute('data-in', '');
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      show();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      {...(stagger ? { 'data-reveal-stagger': variant } : { 'data-reveal': variant })}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
