import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { connection } from 'next/server';
import './globals.css';
import { STORE_NAME } from '@/lib/site';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s · ${STORE_NAME}` },
  description:
    'Shop beauty, fashion, home, electronics and food. Delivered island-wide in Sri Lanka. Cash on delivery.',
};

export const viewport: Viewport = { themeColor: '#faf7f2' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-based CSP (proxy.ts) needs every page rendered per request; static pages get no nonce.
  await connection();
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
