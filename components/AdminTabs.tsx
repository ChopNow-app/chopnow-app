'use client';

import { ShieldCheck, Wallet, BarChart3 } from 'lucide-react';
import { ActorTabNav, type ActorTab } from '@/components/ActorTabNav';

// Admin tabs — defined inside the client component because the `match`
// predicate is a function and React can't serialize functions across the
// server → client boundary (the admin/layout is a server component).
const TABS: ActorTab[] = [
  {
    href: '/admin',
    label: 'Validation',
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p === '/admin',
  },
  {
    href: '/admin/finance',
    label: 'Finance',
    icon: <Wallet className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/admin/finance'),
  },
  {
    href: '/admin/metrics',
    label: 'Métriques',
    icon: <BarChart3 className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/admin/metrics'),
  },
];

// Hide the tabs on /admin/login (pre-auth) so the login surface stays
// focused on email+password and doesn't tease gated routes.
const HIDE_ON = [/^\/admin\/login(\/|$)/];

export function AdminTabs() {
  return <ActorTabNav tabs={TABS} hideOn={HIDE_ON} ariaLabel="Sections admin" />;
}
