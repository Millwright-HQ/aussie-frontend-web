import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { connection } from 'next/server';
import './globals.css';
import { STORE_NAME } from '@/lib/site';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s · ${STORE_NAME}` },
  description:
    'Shop beauty, fashion, home, electronics and food. Delivered island-wide in Sri Lanka. Cash on delivery.',
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-based CSP (proxy.ts) needs every page rendered per request; static pages get no nonce.
  await connection();
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
