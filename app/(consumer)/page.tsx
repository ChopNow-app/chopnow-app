import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

// Marketing splash at /. Editorial counterpart to /restaurants — same
// "Hot Plate" aesthetic: massive asymmetric headline, a red poster card with
// the steam-pattern overlay carrying the tagline + the 3-step promise, and
// the role redirects relegated to a small text strip at the bottom (this is
// a consumer landing — not a portal hub).
//
// Server component on purpose: nothing on this page reads window/document.
// The PwaInstallPrompt is the only client island.

const STEAM_PATTERN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cpath d='M 34.3,11.3 A 13.5,13.5 0 1 0 34.3,28.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3Cpath d='M 82.3,11.3 A 13.5,13.5 0 1 0 82.3,28.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3Cpath d='M 58.3,59.3 A 13.5,13.5 0 1 0 58.3,76.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3C/svg%3E\")";

const STEPS = [
  { n: '01', title: 'Choisis ton vendeur', body: 'Maman du quartier, maquis, restaurant.' },
  { n: '02', title: 'Commande en 3 taps', body: "Plats, panier, adresse — c'est tout." },
  { n: '03', title: 'Reçois en 30 min', body: 'Moto. Chaud. À ta porte.' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-chop-warm text-chop-ink">
      {/* paper grain — 3% noise overlay for editorial feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 mx-auto max-w-md px-5 pb-16 pt-6">
        {/* ── Top nav ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <span className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-chop-ink">
            Chop<span className="text-chop-red">Now.</span>
          </span>
          <PwaInstallPrompt />
        </header>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="pt-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
            Douala <span className="text-chop-red">·</span> Cameroun
          </p>

          {/* Asymmetric stacked headline — three lines, last word in red.
              Tight leading + negative letter-spacing for editorial weight. */}
          <h1 className="mt-3 text-[64px] font-extrabold leading-[0.92] tracking-[-0.04em]">
            Mange
            <br />
            sans
            <br />
            <span className="text-chop-red">attendre.</span>
          </h1>

          <p className="mt-5 max-w-[34ch] text-[15px] font-medium leading-[1.55] text-chop-ink-secondary">
            De la rue à ta porte. Commande tes plats préférés aux vendeurs autour de toi — livré à
            moto en 30 minutes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/restaurants">Commander maintenant</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </section>

        {/* ── Red poster card: tagline + 3 numbered steps ─────────── */}
        <section className="mt-14">
          <div className="relative overflow-hidden rounded-3xl bg-chop-red text-white shadow-elevated">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: STEAM_PATTERN_URL,
                backgroundRepeat: 'repeat',
                backgroundSize: '96px 96px',
              }}
            />
            <div
              aria-hidden
              className="bg-white/12 absolute -bottom-24 -right-24 h-56 w-56 rounded-full blur-3xl"
            />

            <div className="relative px-6 py-7">
              <span className="bg-white/18 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                Le pacte
              </span>
              <h2 className="mt-3 text-[36px] font-extrabold leading-[0.95] tracking-tight">
                De la rue
                <br />à ta porte.
              </h2>

              <ul className="mt-7 space-y-4">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex items-start gap-4">
                    <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-white/55">
                      {s.n}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold leading-tight tracking-tight">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-white/70">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Role redirects: small text strip, not card grid ──── */}
        <nav aria-label="Espaces" className="mt-12 border-t border-divider pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
            Autres espaces
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-divider">
            <RoleLink href="/livreur" label="Espace livreur" sub="Recevoir des courses" />
            <RoleLink href="/vendor" label="Espace vendeur" sub="Gérer le catalogue" />
            <RoleLink href="/admin" label="Admin" sub="Console opérations" />
          </ul>
        </nav>

        {/* ── Foot ─────────────────────────────────────────────── */}
        <footer className="mt-10 text-center text-[11px] font-medium text-chop-ink-secondary">
          Pilote COD · Bonamoussadi & Makepe · 2026
        </footer>
      </div>
    </main>
  );
}

function RoleLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-4 py-3 transition-colors hover:text-chop-red"
      >
        <span>
          <span className="block text-[14px] font-semibold text-chop-ink group-hover:text-chop-red">
            {label}
          </span>
          <span className="block text-[12px] font-medium text-chop-ink-secondary">{sub}</span>
        </span>
        <span
          aria-hidden
          className="text-[15px] font-bold text-chop-ink-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-chop-red"
        >
          →
        </span>
      </Link>
    </li>
  );
}
