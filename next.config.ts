import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

// CSP — tightened in Phase D2 (security audit close-out):
//
//   - script-src: removed `'unsafe-eval'` in prod. Next.js dev needs it
//     for HMR; prod builds don't. Kept `'unsafe-inline'` because the
//     PWA flash-killer in app/layout.tsx is an inline <script> that
//     MUST run before first paint to suppress the splash flicker.
//     Removing 'unsafe-inline' requires either (a) extracting that
//     script to an external file with the parser-blocking cost on
//     first-time visitors, or (b) per-request CSP nonces which force
//     every route into dynamic SSR (loses Vercel's static prerender).
//     Both have downsides; deferred as a Phase D3 follow-up.
//
//   - connect-src: narrowed from `https:` (allows ANY HTTPS origin —
//     attacker exfiltration surface) to a specific allowlist of the
//     API origins we know we call. Same-origin (`'self'`) covers
//     Vercel Analytics + Speed Insights beacons and /r2/* image
//     rewrites.
//
//   - style-src: keeps 'unsafe-inline' because React's `style={{...}}`
//     prop generates inline style attributes that CSP would otherwise
//     block. Removing this would break every dynamically-styled
//     component — out of scope for a security tightening pass.
const connectSrc = isDev
  ? "connect-src 'self' http://localhost:* https: wss: ws:"
  : // Prod: explicit allowlist. Add prod API origin once it goes live.
    "connect-src 'self' https://api-staging.tchopnow.app https://api.tchopnow.app wss://api-staging.tchopnow.app wss://api.tchopnow.app";

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
  : // Prod: 'unsafe-eval' removed — Next.js prod builds don't need it.
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      connectSrc,
      // Turnstile's challenge UI renders inside an iframe hosted on
      // challenges.cloudflare.com. frame-ancestors stays 'none' (we
      // still refuse being embedded); this only allows our page to
      // embed THEIR iframe.
      'frame-src https://challenges.cloudflare.com',
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
