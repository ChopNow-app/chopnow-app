'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Bottom tab bar for the consumer PWA — per DESIGN.md §4 Navigation.
// 64px height + safe-area-inset-bottom padding for iPhone home indicator.
// Active tab: Chop Orange icon + label with 3px orange dot underneath.
// Inactive: ink-tertiary gray.

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  // `match` decides if this tab is "active" for the given path.
  // Default is exact match; deeper routes need a prefix predicate.
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

// Routes that should NOT render the bottom nav (full-screen flows or
// non-consumer surfaces). Keep this list narrow — default is to show it.
//
// IMPORTANT: `/^\/vendor(\/|$)/` (with the explicit boundary) matches the
// vendor *dashboard* (/vendor, /vendor/profile) but NOT `/vendors/[id]`,
// which is the public consumer-facing vendor detail page. Same prefix
// collision class as the robots.txt /vendor → /vendors bug fixed in
// chopnow-app#226 — kept this list in sync with ConsumerTopNav's.
const HIDE_ON: ReadonlyArray<string | RegExp> = [
  '/login',
  /^\/admin(\/|$)/,
  /^\/livreur(\/|$)/,
  /^\/vendor(\/|$)/,
  '/livrer',
  '/vendre',
  /^\/t\//, // public order tracking — no app shell
];

export function ConsumerBottomNav() {
  const pathname = usePathname() ?? '/';

  const hidden = HIDE_ON.some((p) => (typeof p === 'string' ? pathname === p : p.test(pathname)));
  if (hidden) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-background lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match ? tab.match(pathname) : pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                  active ? 'text-chop-red' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                <span className={cn('text-[11px]', active && 'font-semibold')}>{tab.label}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 h-[3px] w-1 rounded-full bg-chop-red"
                  />
                ) : (
                  <span aria-hidden="true" className="mt-0.5 h-[3px] w-1" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
