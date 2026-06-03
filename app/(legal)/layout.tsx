import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';

// Shared chrome for the legal routes (/mentions-legales, /cgu,
// /confidentialite). Single column, max-w prose, editorial spacing.
// Same SiteFooter as the marketing splash so the surface stays
// consistent for SEO crawlers + curious users navigating back.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chop-warm text-chop-ink">
      <header className="relative z-10 border-b border-divider/50">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 md:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Accueil Tchop NoW"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-chop-ink-secondary transition-colors hover:text-chop-ink"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Accueil
          </Link>
          <span className="ml-auto text-[15px] font-extrabold uppercase tracking-[0.18em] text-chop-ink md:text-[17px]">
            Tchop <span className="text-chop-red">NoW</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14 lg:px-12">{children}</main>

      <SiteFooter />
    </div>
  );
}
