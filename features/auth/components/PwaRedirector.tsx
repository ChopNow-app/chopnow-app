'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/**
 * When the app is launched from a home-screen icon (display-mode:
 * standalone), bypass the marketing splash entirely and go straight to
 * the catalogue. The splash is a "this is ChopNow, here's why you'd
 * install it" pitch — installed users have already accepted it and
 * shouldn't see it again every time they tap the icon.
 *
 * Decision deferred to the client because `matchMedia` requires window.
 * The RoleRedirector that lives next to this component handles the
 * authed-user case (vendor → /vendor, rider → /livreur). PwaRedirector
 * fires for anonymous users in standalone mode — the gap RoleRedirector
 * doesn't cover.
 *
 * `router.replace` (not `push`) so the splash is never in browser
 * history — back-button stays predictable.
 */
export function PwaRedirector() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Cover all three display-mode variants Chrome / Safari / Edge /
    // Samsung Internet report for installed PWAs: `standalone` (default),
    // `fullscreen` (Android opt-in via manifest), `minimal-ui` (Samsung
    // Internet's default). Mirror the inline head-script logic in
    // app/layout.tsx so both detection paths stay in sync.
    const mm = window.matchMedia;
    const isStandalone =
      (mm &&
        (mm('(display-mode: standalone)').matches ||
          mm('(display-mode: fullscreen)').matches ||
          mm('(display-mode: minimal-ui)').matches)) ||
      // iOS Safari before 16.4 reports standalone via navigator instead
      // of the media query — cover the older devices too.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      // No visibility:hidden here — by the time this React effect
      // fires (post-hydration), the splash has already painted at
      // least one frame, so hiding now is too late and would also
      // get carried into /launch (router.replace = same document).
      // The inline head script in app/layout.tsx handles the
      // before-paint case; this is the engines-that-blocked-inline
      // fallback.
      router.replace('/launch?source=pwa');
    }
  }, [router]);

  return null;
}
