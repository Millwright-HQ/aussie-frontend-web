import { describe, expect, it } from 'vitest';
import { parseAgent } from './user-agent';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const SAMSUNG =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';
const WIN_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

describe('parseAgent', () => {
  it('reads phones, tablets and desktops', () => {
    expect(parseAgent(IPHONE)).toEqual({
      bot: false,
      device: 'mobile',
      browser: 'safari',
      system: 'ios',
    });
    expect(parseAgent(ANDROID_CHROME)).toEqual({
      bot: false,
      device: 'mobile',
      browser: 'chrome',
      system: 'android',
    });
    expect(parseAgent(IPAD)).toMatchObject({ device: 'tablet', system: 'ios' });
    expect(parseAgent(WIN_EDGE)).toEqual({
      bot: false,
      device: 'desktop',
      browser: 'edge',
      system: 'windows',
    });
    expect(parseAgent(MAC_SAFARI)).toMatchObject({
      device: 'desktop',
      browser: 'safari',
      system: 'macos',
    });
  });

  it('tells Chrome-based browsers apart', () => {
    expect(parseAgent(SAMSUNG).browser).toBe('samsung');
    expect(parseAgent(WIN_EDGE).browser).toBe('edge');
  });

  it('never counts crawlers, previews, scripts or empty agents', () => {
    for (const ua of [
      '',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'facebookexternalhit/1.1',
      'WhatsApp/2.23',
      'curl/8.4.0',
      'Mozilla/5.0 HeadlessChrome/126.0.0.0 Safari/537.36',
    ]) {
      expect(parseAgent(ua).bot).toBe(true);
    }
  });
});
