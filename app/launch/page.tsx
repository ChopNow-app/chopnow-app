import { Suspense } from 'react';
import { LaunchRedirector } from './LaunchRedirector';

// Mark dynamic so Next doesn't try to statically prerender — we read
// search params on the client and don't want a stale prerender.
export const dynamic = 'force-dynamic';

/**
 * PWA launch splash. The home-screen icon points here (via manifest
 * start_url), so this is the *first* surface a returning user sees.
 * On iOS, the OS-rendered splash (icon on chop-red from manifest's
 * background_color) blends seamlessly into this page, then a brief
 * logo+wordmark beat sells the brand for a moment before we hand off
 * to the real route.
 *
 * Server-rendered shell so the logo paints with the very first frame —
 * no JS hydration required for the image to appear. A tiny client
 * island (LaunchRedirector) handles the timed handoff + reads ?then=
 * for the destination (defaults to /restaurants).
 */
export default function LaunchPage() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-chop-red text-white">
      {/* Logo block — animates in on first paint. The `animate-in`
          utility comes from tailwindcss-animate. fade-in is on the
          wordmark; the icon scales-in to draw the eye first. */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-icon-white.svg"
            alt=""
            aria-hidden
            className="h-20 w-20 object-contain duration-500 ease-out animate-in zoom-in-50"
          />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight delay-200 duration-700 animate-in fade-in slide-in-from-bottom-2">
          Tchop NoW
        </h1>
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/80 delay-500 duration-700 animate-in fade-in">
          Mange sans attendre
        </p>
      </div>

      {/* Client island that performs the handoff after the splash beat.
          Wrapped in Suspense so useSearchParams() doesn't block render. */}
      <Suspense fallback={null}>
        <LaunchRedirector />
      </Suspense>
    </main>
  );
}
