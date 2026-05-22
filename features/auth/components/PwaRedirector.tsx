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
    // Chrome, Safari iOS 16.4+, Android — `display-mode: standalone`
    // matches when the page is rendering inside the installed PWA shell
    // (no browser address bar). Falls back to false on engines that
    // don't expose this media query; web visitors see the splash.
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari before 16.4 reports standalone via navigator instead
      // of the media query — cover the older devices too.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      // Go through /launch (the branded splash) for the proper
      // OS-splash → app-splash → catalogue handoff. Matches what the
      // inline head script in app/layout.tsx does for the synchronous
      // case; this is the post-hydration fallback for environments
      // that blocked the inline script (strict CSP, etc).
      router.replace('/launch?source=pwa');
    }
  }, [router]);

  return null;
}
