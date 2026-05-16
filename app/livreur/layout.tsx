export const metadata = { title: 'TChopNow — Livreur' };

// Per DESIGN.md §2 surfaces: rider app is dark-by-default for outdoor
// readability under Cameroon sun + protects driver night-vision. Deep ink
// background, dark-surface cards. WCAG AAA contrast on critical CTAs.
export default function LivreurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chop-deep-ink text-white">
      <header
        className="sticky top-0 z-30 border-b border-chop-dark-border bg-chop-deep-ink/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <span className="text-sm font-extrabold uppercase tracking-widest text-chop-red">
          TChopNow · Livreur
        </span>
      </header>
      <div className="container max-w-md px-4 py-6">{children}</div>
    </div>
  );
}
