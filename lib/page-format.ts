/**
 * Information pages are written as plain text with a few simple marks, so the owner can format a
 * policy without HTML and nobody can slip scripts into a page. This turns the text into a small
 * tree that React renders as elements (never as raw HTML).
 *
 *   ## Heading            a section heading        # Big heading    the page's top heading
 *   - item                a bullet (one per line)  1. item          a numbered step
 *   **bold**              bold text                [text](url)      a link (/page, https://, mailto:, tel:)
 *   blank line            starts a new paragraph
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'h1' | 'h2'; text: string }
  | { type: 'p'; inline: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] };

/** Only links that cannot run script or leave the site by surprise. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^\/(?!\/)\S*$/.test(h)) return h;
  if (/^https:\/\/\S+$/.test(h)) return h;
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(h)) return h;
  if (/^tel:\+?[0-9 ()-]+$/.test(h)) return h;
  return null;
}

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of line.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', text: line.slice(last, at) });
    if (m[1] !== undefined) {
      out.push({ type: 'bold', text: m[1] });
    } else {
      const href = safeHref(m[3] ?? '');
      // An unsafe link is shown as plain text, never as a link.
      out.push(
        href ? { type: 'link', text: m[2] ?? '', href } : { type: 'text', text: m[2] ?? '' },
      );
    }
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ type: 'text', text: line.slice(last) });
  return out;
}

export function parsePageBody(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: Inline[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', inline: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: heading[1] === '#' ? 'h1' : 'h2', text: heading[2] ?? '' });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const step = /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet || step) {
      flushParagraph();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push(parseInline((bullet ?? step)?.[1] ?? ''));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
