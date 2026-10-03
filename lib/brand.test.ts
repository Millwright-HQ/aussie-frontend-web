import { describe, expect, it } from 'vitest';
import { brandVars, contrast, isHexColour, readableOn } from './brand';

describe('contrast', () => {
  it('is 21 for black on white and 1 for the same colour', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5);
  });
});

describe('readableOn', () => {
  it('picks white on dark colours and near-black on light colours', () => {
    expect(readableOn('#0b3d91')).toBe('#ffffff');
    expect(readableOn('#ffe066')).toBe('#111111');
  });
});

describe('isHexColour', () => {
  it('accepts #rrggbb only', () => {
    expect(isHexColour('#a1B2c3')).toBe(true);
    for (const bad of ['a1b2c3', '#abc', '#12345g', 'red', '', undefined, 'url(x)']) {
      expect(isHexColour(bad), String(bad)).toBe(false);
    }
  });
});

describe('brandVars', () => {
  it('does nothing without a valid colour', () => {
    expect(brandVars(undefined)).toBeUndefined();
    expect(brandVars('red')).toBeUndefined();
  });

  it('always gives readable colours, whatever the owner picks', () => {
    for (const pick of [
      '#ffe066',
      '#00ffff',
      '#ff69b4',
      '#111111',
      '#ffffff',
      '#0b3d91',
      '#8c2f4b',
      '#7fff00',
    ]) {
      const v = brandVars(pick);
      expect(v, pick).toBeDefined();
      if (!v) continue;
      // Link and button colour on the light page, and the text on a button.
      expect(contrast(v['--brand-light'], '#ffffff'), `${pick} light`).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(v['--brand-light-fg'], v['--brand-light']),
        `${pick} light text`,
      ).toBeGreaterThanOrEqual(4.5);
      // The same on the dark page.
      expect(contrast(v['--brand-dark'], '#171717'), `${pick} dark`).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(v['--brand-dark-fg'], v['--brand-dark']),
        `${pick} dark text`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps a colour that is already readable', () => {
    expect(brandVars('#0b3d91')?.['--brand-light']).toBe('#0b3d91');
  });
});
