/** What analytics needs to know about a browser, read from its User-Agent text. */
export interface Agent {
  /** Crawlers, link previews, monitors and scripts: never counted. */
  bot: boolean;
  device: 'mobile' | 'tablet' | 'desktop' | 'other';
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'other';
  system: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'other';
}

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|java\/|node-fetch|axios|go-http|monitor|uptime|pingdom|scan/i;

export function parseAgent(ua: string): Agent {
  const bot = ua.trim() === '' || BOT.test(ua);
  const device: Agent['device'] = /ipad|tablet|android(?!.*mobile)/i.test(ua)
    ? 'tablet'
    : /mobi|iphone|ipod|android/i.test(ua)
      ? 'mobile'
      : /windows|macintosh|mac os x|linux|cros/i.test(ua)
        ? 'desktop'
        : 'other';
  // Order matters: Edge, Opera and Samsung Browser all say "Chrome"; Chrome says "Safari".
  const browser: Agent['browser'] = /edg(e|a|ios)?\//i.test(ua)
    ? 'edge'
    : /opr\/|opera/i.test(ua)
      ? 'opera'
      : /samsungbrowser/i.test(ua)
        ? 'samsung'
        : /firefox|fxios/i.test(ua)
          ? 'firefox'
          : /chrome|crios/i.test(ua)
            ? 'chrome'
            : /safari/i.test(ua)
              ? 'safari'
              : 'other';
  const system: Agent['system'] = /android/i.test(ua)
    ? 'android'
    : /iphone|ipad|ipod/i.test(ua)
      ? 'ios'
      : /windows/i.test(ua)
        ? 'windows'
        : /mac os x|macintosh/i.test(ua)
          ? 'macos'
          : /linux|cros/i.test(ua)
            ? 'linux'
            : 'other';
  return { bot, device, browser, system };
}
