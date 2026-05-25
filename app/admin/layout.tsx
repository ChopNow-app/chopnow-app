import { ShieldCheck, Wallet, BarChart3 } from 'lucide-react';
import { ActorTabNav, type ActorTab } from '@/components/ActorTabNav';
import { CampayCircuitBadge } from '@/features/admin/components/CampayCircuitBadge';

// Auth-gated subtree — see vendor/layout.tsx for the rationale.
export const metadata = {
  title: 'TChopNow — Admin',
  robots: { index: false, follow: false },
};

// Admin tabs — 3 entry points after login. Wraps `/admin/login` only as
// the auth screen, and each tab below is a SUPER_ADMIN landing surface.
const ADMIN_TABS: ActorTab[] = [
  {
    href: '/admin',
    label: 'Validation',
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2} />,
    // Highlight on the dashboard root and any future /admin/users etc.
    // but NOT on /admin/finance or /admin/metrics — those have their own tabs.
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

// Hide the tabs on /admin/login (you're not authenticated yet) so the
// login screen stays focused on email+password without prompting nav
// to gated routes the user can't reach anyway.
const HIDE_TABS_ON = [/^\/admin\/login(\/|$)/];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-widest text-destructive">
            TChopNow Admin
          </span>
          <ActorTabNav tabs={ADMIN_TABS} hideOn={HIDE_TABS_ON} ariaLabel="Sections admin" />
          <CampayCircuitBadge />
        </div>
      </header>
      <div className="container max-w-7xl py-6">{children}</div>
    </div>
  );
}
