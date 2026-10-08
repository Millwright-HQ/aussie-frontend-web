import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { BrandIcon } from '../components/brand-icons';

it('renders every brand icon with a real path, hidden from screen readers', () => {
  for (const n of ['facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube'] as const) {
    const html = renderToStaticMarkup(createElement(BrandIcon, { name: n, width: 20, height: 20 }));
    expect(html).toMatch(/<path d="M[^"]{80,}"/);
    expect(html).toContain('aria-hidden="true"');
  }
});
