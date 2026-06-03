import { AdminTabs } from '@/components/AdminTabs';
import { CampayCircuitBadge } from '@/features/admin/components/CampayCircuitBadge';

// Auth-gated subtree — see vendor/layout.tsx for the rationale.
export const metadata = {
  title: 'Tchop NoW — Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-widest text-destructive">
            Tchop NoW Admin
          </span>
          <AdminTabs />
          <CampayCircuitBadge />
        </div>
      </header>
      <div className="container max-w-7xl py-6">{children}</div>
    </div>
  );
}
