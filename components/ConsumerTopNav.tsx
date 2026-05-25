'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy-load the install modal — it's a sizable client island and only
// useful for the small fraction of desktop visitors who'll install the
// PWA. Splitting keeps the top-nav bundle lean.
const PwaInstallModal = dynamic(() =>
  import('@/components/PwaInstallModal').then((m) => ({ default: m.PwaInstallModal })),
);

// Top tab bar for desktop only — mirrors ConsumerBottomNav for parity.
// The bottom nav is `lg:hidden` so desktop visitors had no nav at all on
// inner consumer routes (/restaurants, /orders, /account, /vendors/[id]).
// They were stranded — could only navigate by typing URLs or hitting
// in-page CTAs.
//
// This component is `hidden lg:flex` so it only shows from 1024px up.
// Same hide-list as the bottom nav so the two are mutually exclusive on
// non-consumer surfaces (admin / livreur / vendor / login).

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match?: (path: string) => boolean;
}

const TABS: Tab[] = [
  { href: '/', label: 'Accueil', icon: Home, match: (p) => p === '/' },
  {
    href: '/restaurants',
    label: 'Restos',
    icon: ShoppingBag,
    match: (p) => p === '/restaurants' || p.startsWith('/vendors/'),
  },
  {
    href: '/orders',
    label: 'Commandes',
    icon: ClipboardList,
    match: (p) => p.startsWith('/orders'),
  },
  {
    href: '/account',
    label: 'Compte',
    icon: User,
    match: (p) => p.startsWith('/account'),
  },
];

// Same hide list as ConsumerBottomNav — keep the two in sync so we don't
// end up with a header on /admin (where we don't want a consumer nav at all).
//
// IMPORTANT: trailing-slash discipline on `/vendor/` and `/livreur/` is
// load-bearing. `^/vendor` (no trailing slash) would also match
// `/vendors/[id]` — the public consumer-facing vendor detail page —
// and silently hide the nav on those routes. Same byte-wise prefix
// collision class as the robots.txt /vendor → /vendors bug fixed in
// chopnow-app#226.
const HIDE_ON: ReadonlyArray<string | RegExp> = [
  '/login',
  /^\/admin(\/|$)/,
  /^\/livreur(\/|$)/,
  /^\/vendor(\/|$)/,
  '/livrer',
  '/vendre',
  /^\/t\//, // public order tracking — no app shell
  // Legal routes have their own minimal chrome (back-to-home link +
  // brand mark) inside (legal)/layout.tsx. Showing the app nav on top
  // would compete with the SiteFooter that already lists the legal
  // pages — keep these surfaces editorial.
  '/mentions-legales',
  '/cgu',
  '/confidentialite',
];

export function ConsumerTopNav() {
  const pathname = usePathname() ?? '/';

  const hidden = HIDE_ON.some((p) => (typeof p === 'string' ? pathname === p : p.test(pathname)));
  if (hidden) return null;

  return (
    <nav
      aria-label="Navigation principale (desktop)"
      className="sticky top-0 z-30 hidden border-b border-divider/60 bg-chop-warm/95 backdrop-blur supports-[backdrop-filter]:bg-chop-warm/80 lg:flex"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-8 py-3 lg:px-12">
        {/* Brand mark — clicks back to /. Same wordmark shape as the splash
            header so the logo identity stays consistent across surfaces. */}
        <Link
          href="/"
          aria-label="TChopNow accueil"
          className="text-[17px] font-extrabold uppercase tracking-[0.18em] text-chop-ink"
        >
          TChop<span className="text-chop-red">Now.</span>
        </Link>

        {/* 4 tabs — same 4 destinations as the mobile bottom nav. Active
            tab gets the red pill treatment so it reads at-a-glance which
            section the user is in. */}
        <ul className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = tab.match ? tab.match(pathname) : pathname === tab.href;
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-chop-red text-white shadow-card'
                      : 'text-chop-ink-secondary hover:bg-chop-surface-gray hover:text-chop-ink',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right side: install CTA — shown on every consumer surface
            (including the splash). The splash's own header gets
            `lg:hidden` so it doesn't double up with this one. */}
        <div className="flex items-center gap-2">
          <PwaInstallModal />
        </div>
      </div>
    </nav>
  );
}
