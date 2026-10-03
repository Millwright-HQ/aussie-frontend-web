import Link from 'next/link';
import { type Inline, parsePageBody } from '@/lib/page-format';

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) => {
    if (p.type === 'bold') return <strong key={i}>{p.text}</strong>;
    if (p.type === 'link') {
      const cls = 'text-primary underline underline-offset-4';
      return p.href.startsWith('/') ? (
        <Link key={i} href={p.href} className={cls}>
          {p.text}
        </Link>
      ) : (
        <a key={i} href={p.href} className={cls} rel="noopener noreferrer">
          {p.text}
        </a>
      );
    }
    return p.text;
  });
}

/** Renders an information page's text as safe React elements (no raw HTML anywhere). */
export function PageBody({ body }: { body: string }) {
  return (
    <div className="space-y-4 leading-relaxed">
      {parsePageBody(body).map((b, i) => {
        switch (b.type) {
          case 'h1':
            return (
              <h2 key={i} className="text-h2 pt-4">
                {b.text}
              </h2>
            );
          case 'h2':
            return (
              <h3 key={i} className="text-h3 pt-2">
                {b.text}
              </h3>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines parts={item} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1 pl-6">
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines parts={item} />
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={i}>
                <Inlines parts={b.inline} />
              </p>
            );
        }
      })}
    </div>
  );
}
