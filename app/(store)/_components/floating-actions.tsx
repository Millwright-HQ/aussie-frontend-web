'use client';

import { ArrowUp, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/** WhatsApp chat (when the owner has set a number) and a back-to-top button, floating over the page. */
export function FloatingActions({ whatsapp, storeName }: { whatsapp?: string; storeName: string }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const digits = whatsapp?.replace(/\D/g, '');
  return (
    <>
      {digits && (
        <a
          href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${storeName}, I have a question.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-5 left-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-text text-bg shadow-md print:hidden"
        >
          <MessageCircle aria-hidden size={22} />
        </a>
      )}
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed right-4 bottom-5 z-40 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md print:hidden"
        >
          <ArrowUp aria-hidden size={18} />
        </button>
      )}
    </>
  );
}
