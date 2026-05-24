import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ConsumerBottomNav } from '@/components/ConsumerBottomNav';
import { PilotBanner } from '@/components/PilotBanner';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';
import { Toaster } from '@/components/ui/toaster';
import { APPLE_SPLASH_SCREENS } from '@/lib/pwa/apple-splash-screens';
import { SessionBoot } from '@/lib/auth/SessionBoot';
import { QueryProvider } from '@/lib/query/QueryProvider';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TChopNow — Mange sans attendre',
  description: 'De la rue à ta porte. Livraison de nourriture à Douala.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TChopNow',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/icons/icon-180.png', sizes: '180x180' },
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#E11D2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // `cover` lets the app paint under the iOS notch + home indicator so
  // PWA chrome looks edge-to-edge. Components that need to dodge the
  // notch use safe-area-inset-* in their padding.
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={jakarta.variable}>
      <head>
        {/* PWA flash-killer. Runs synchronously in <head> BEFORE the first
            paint — so a PWA user who somehow lands on `/` (refresh in
            standalone mode, stale-manifest install, deep-link gone wrong)
            never sees the marketing splash flash. The corresponding
            React-side `PwaRedirector` was firing after hydration which
            was too late — visible content for ~1 frame. This script is
            the synchronous fix; PwaRedirector stays as a fallback for
            engines that block inline scripts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname!=="/")return;var s=window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches;var i=window.navigator&&window.navigator.standalone===true;if(s||i)location.replace("/launch?source=pwa");}catch(e){}})();`,
          }}
        />
        {/* iOS PWA splash screens. iOS Safari doesn't read manifest.json's
            splash entries — it needs <link rel="apple-touch-startup-image">
            per device size + orientation. Without these, an installed PWA
            launches with ~500ms of blank white before the page paints —
            longer on 3G. See `lib/pwa/apple-splash-screens.ts`. */}
        {APPLE_SPLASH_SCREENS.map((s) => (
          <link
            key={`${s.file}-${s.orientation}`}
            rel="apple-touch-startup-image"
            href={`/icons/splash/${s.file}`}
            media={`(device-width: ${s.deviceWidth}px) and (device-height: ${s.deviceHeight}px) and (-webkit-device-pixel-ratio: ${s.pixelRatio}) and (orientation: ${s.orientation})`}
          />
        ))}
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            {/* Phase B1 — fires /auth/refresh on app start, populates the
                in-memory access token from the HttpOnly refresh cookie.
                Must mount before any auth-gated UI so useSession() can
                resolve booting → authenticated without a flash of
                "logged out". */}
            <SessionBoot />
            <PilotBanner />
            {/* pb-20 = 80px reserve for bottom nav (64px + safe-area-inset). */}
            {/* ConsumerBottomNav hides itself on admin/livreur/vendor routes. */}
            <div className="min-h-dvh pb-20 lg:pb-0">{children}</div>
            <ConsumerBottomNav />
            {/* Toast viewport — see hooks/use-toast.ts for the imperative API.
                Mounted here (not in route layouts) so any surface — including
                error boundaries, async callbacks, and the SW push handler —
                can dispatch toasts without prop-drilling. */}
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
