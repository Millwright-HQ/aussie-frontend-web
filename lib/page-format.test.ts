import { describe, expect, it } from 'vitest';
import { parseInline, parsePageBody, safeHref } from './page-format';

describe('safeHref', () => {
  it('allows store paths, https, mailto and tel', () => {
    for (const ok of [
      '/shop',
      '/info/terms',
      'https://example.lk/a?b=1',
      'mailto:hi@x.lk',
      'tel:+94771234567',
    ]) {
      expect(safeHref(ok), ok).toBe(ok);
    }
  });
  it('refuses anything that could run script or leave the site by surprise', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>1</script>',
      '//evil.example',
      'http://insecure.example',
      'vbscript:x',
      '',
    ]) {
      expect(safeHref(bad), bad).toBeNull();
    }
  });
});

describe('parseInline', () => {
  it('finds bold text and links between plain text', () => {
    expect(parseInline('Pay **cash** or [track](/track) now')).toEqual([
      { type: 'text', text: 'Pay ' },
      { type: 'bold', text: 'cash' },
      { type: 'text', text: ' or ' },
      { type: 'link', text: 'track', href: '/track' },
      { type: 'text', text: ' now' },
    ]);
  });
  it('shows an unsafe link as plain text, never as a link', () => {
    const parts = parseInline('[click](javascript:alert(1))');
    expect(parts.some((p) => p.type === 'link')).toBe(false);
    expect(parts[0]).toEqual({ type: 'text', text: 'click' });
  });
  it('leaves HTML as text (React escapes it when rendering)', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([
      { type: 'text', text: '<script>alert(1)</script>' },
    ]);
  });
});

describe('parsePageBody', () => {
  it('builds headings, paragraphs and lists', () => {
    const blocks = parsePageBody(
      [
        '# Terms',
        '',
        '## Orders',
        'Line one',
        'line two',
        '',
        '- a',
        '- b',
        '',
        '1. first',
        '2. second',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.type)).toEqual(['h1', 'h2', 'p', 'ul', 'ol']);
    expect(blocks[2]).toEqual({ type: 'p', inline: [{ type: 'text', text: 'Line one line two' }] });
    expect(blocks[3]).toMatchObject({ type: 'ul' });
    expect((blocks[3] as { items: unknown[] }).items).toHaveLength(2);
  });
  it('handles Windows line endings and empty text', () => {
    expect(parsePageBody('a\r\n\r\nb')).toHaveLength(2);
    expect(parsePageBody('')).toEqual([]);
    expect(parsePageBody('   \n  ')).toEqual([]);
  });
});
