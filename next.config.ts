import type { NextConfig } from 'next';

// Static security headers. The CSP is per-request (nonce) and set in proxy.ts.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@aussie/ui'],
  // Product images are pre-resized WebP renditions on the CDN; the loader picks one per size.
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts' },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // The admin was reorganised (2026-10-05): old bookmarks keep working.
  async redirects() {
    return [
      { source: '/admin/banners', destination: '/admin/site/banners', permanent: false },
      { source: '/admin/pages', destination: '/admin/site/pages', permanent: false },
      { source: '/admin/pages/:slug', destination: '/admin/site/pages/:slug', permanent: false },
      { source: '/admin/delivery', destination: '/admin/site/delivery', permanent: false },
      { source: '/admin/payments', destination: '/admin/site/payments', permanent: false },
      { source: '/admin/brands', destination: '/admin/products/brands', permanent: false },
      { source: '/admin/categories', destination: '/admin/products/categories', permanent: false },
      {
        source: '/admin/categories/:id',
        destination: '/admin/products/categories/:id',
        permanent: false,
      },
      { source: '/admin/inventory', destination: '/admin/products?stock=low', permanent: false },
      {
        source: '/admin/inventory/history',
        destination: '/admin/products/stock-history',
        permanent: false,
      },
      {
        source: '/admin/inventory/:variantId',
        destination: '/admin/products/stock/:variantId',
        permanent: false,
      },
      { source: '/admin/security', destination: '/admin/profile?tab=security', permanent: false },
    ];
  },
};

export default nextConfig;
