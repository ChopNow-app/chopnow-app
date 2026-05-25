'use client';

import { ClipboardList, UtensilsCrossed, Clock, User } from 'lucide-react';
import { ActorTabNav, type ActorTab } from '@/components/ActorTabNav';

// Vendor tabs — defined inside the client component because the `match`
// predicate is a function and the vendor layout that hosts this is a
// server component (RSC props serialization can't carry functions).
//
// Order chosen by frequency of use during a typical shift: incoming
// Commandes first (the whole reason the app exists for the kitchen),
// then Menu management, then Horaires (open/close), then Profil
// (rare edits).
const TABS: ActorTab[] = [
  {
    href: '/vendor',
    label: 'Commandes',
    icon: <ClipboardList className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p === '/vendor',
  },
  {
    href: '/vendor/menu',
    label: 'Menu',
    icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/menu'),
  },
  {
    href: '/vendor/hours',
    label: 'Horaires',
    icon: <Clock className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/hours'),
  },
  {
    href: '/vendor/profile',
    label: 'Profil',
    icon: <User className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/profile'),
  },
];

// Hide the tabs on full-screen takeover routes — /vendor/commande/[id]
// (60s accept countdown) and /vendor/preparation/[id] (active cook view)
// both intentionally fill the viewport with one focused task. Tabs would
// dilute the urgency, so suppress.
const HIDE_ON = [/^\/vendor\/commande\//, /^\/vendor\/preparation\//];

export function VendorTabs() {
  return <ActorTabNav tabs={TABS} hideOn={HIDE_ON} ariaLabel="Sections vendeur" />;
}
