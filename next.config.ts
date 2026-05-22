import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

// In dev the backend is plain http://localhost:* so connect-src must allow it,
// otherwise the browser blocks every fetch to /api. In prod the API lives on
// https:// and we keep the tighter policy.
const connectSrc = isDev
  ? "connect-src 'self' http://localhost:* https: wss: ws:"
  : "connect-src 'self' https: wss:";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Content-Security-Policy: tightened in Sprint 1+ when third-party scripts (analytics) are wired.
  // For now keep it permissive enough that Next dev server + Tailwind hot reload works.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  // /r2/<key> rewrites to the API's public media proxy. VendorCard /
  // VendorDetailPage render <img src={`/r2/${profilePhotoUrl}`} /> and
  // the API streams the WebP bytes from R2 with a 24h immutable cache.
  // Falls back to localhost so dev works without setting the env var.
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
    return [{ source: '/r2/:path*', destination: `${api}/api/media/:path*` }];
  },
};

export default withNextIntl(config);
