import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ShieldCheck, Bike, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/SiteFooter';
import { PwaRedirector } from '@/features/auth/components/PwaRedirector';
import { RoleRedirector } from '@/features/auth/components/RoleRedirector';
import { MobileOnboarding } from '@/features/onboarding/components/MobileOnboarding';

// Lazy: PwaInstallModal is a sizable client island (platform detection,
// beforeinstallprompt handling, iOS install guide UI) that's only shown
// once per visitor and is below-the-fold on first paint. Splitting it
// out keeps the marketing-splash initial JS lean. Can't pass ssr:false
// here because the host page is a Server Component; chunk still splits
// off and loads after first paint.
const PwaInstallModal = dynamic(() =>
  import('@/components/PwaInstallModal').then((m) => ({ default: m.PwaInstallModal })),
);

// Marketing splash at /. Editorial counterpart to /restaurants — same
// "Hot Plate" aesthetic, but on desktop the hero opens into a 2-column
// layout (text left, red poster right) so the page actually uses screen
// real estate instead of stranding the user in a centered phone column.
//
// Breakpoints:
//   <md           single column, max-w-md, mobile-first
//   md  (768+)    wider single column, max-w-3xl, larger type
//   lg  (1024+)   max-w-7xl, 2-col hero (1.3fr text + 1fr poster)
//   xl  (1280+)   max-w-7xl with more breathing room
//
// Server component on purpose. PwaInstallModal is the only client island.

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
      {/* Role-aware redirect: logged-in users are sent to their surface
          (vendor → /vendor, rider → /livreur, consumer → /restaurants).
          Anonymous visitors see the splash below. Renders an overlay while
          fetching /users/me to hide the splash-flicker. */}
      <RoleRedirector />

      {/* Anonymous PWA users skip the splash too. The marketing pitch is
          for web visitors; once someone's installed the app they've
          already accepted it. Logged-in PWA users are caught by
          RoleRedirector above before reaching this. */}
      <PwaRedirector />

      {/* First-visit mobile onboarding carousel — only shows for anonymous
          visitors on narrow viewports who haven't dismissed it yet. Decides
          its own visibility client-side; null on desktop / second visit /
          authed sessions. Sits above the splash so the underlying static
          content remains for SEO + desktop fallback. */}
      <MobileOnboarding />

      {/* paper grain — 3% noise overlay for editorial feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Top nav — mobile only. ConsumerTopNav in the root layout
          takes over on lg+ with the same logo + the 4 navigation tabs
          (mirrors the bottom nav for desktop parity). ───────────── */}
      <header className="relative z-10 border-b border-divider/50 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8 lg:px-12">
          <span className="text-[15px] font-extrabold uppercase tracking-[0.18em] text-chop-ink md:text-[17px]">
            TChop<span className="text-chop-red">Now.</span>
          </span>
          <PwaInstallModal />
        </div>
      </header>

      {/* ── Hero — stacked on mobile, 2-col on lg ───────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pt-10 md:px-8 md:pt-16 lg:px-12 lg:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14 xl:gap-20">
          {/* ── Left: editorial hero ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
              Douala <span className="text-chop-red">·</span> Cameroun
            </p>

            <h1 className="mt-3 text-[64px] font-extrabold leading-[0.92] tracking-[-0.04em] md:text-[96px] lg:text-[120px] xl:text-[140px]">
              Mange
              <br />
              sans
              <br />
              <span className="text-chop-red">attendre.</span>
            </h1>

            <p className="mt-5 max-w-[44ch] text-[15px] font-medium leading-[1.55] text-chop-ink-secondary md:mt-6 md:max-w-[52ch] md:text-[17px] lg:text-[18px]">
              De la rue à ta porte. Commande tes plats préférés aux vendeurs autour de toi — livré à
              moto en 30 minutes.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
              <Button asChild size="lg">
                <Link href="/restaurants">Commander maintenant</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          </div>

          {/* ── Right: red poster card — sits next to hero on lg+ ── */}
          <div className="lg:sticky lg:top-8">
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
                className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-white/10 blur-3xl"
              />

              <div className="relative px-6 py-7 md:px-8 md:py-10">
                <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                  Le pacte
                </span>
                <h2 className="mt-3 text-[36px] font-extrabold leading-[0.95] tracking-tight md:text-[44px]">
                  De la rue
                  <br />à ta porte.
                </h2>

                <ul className="mt-7 space-y-4 md:mt-9">
                  {STEPS.map((s) => (
                    <li key={s.n} className="flex items-start gap-4">
                      <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-white/55 md:text-[14px]">
                        {s.n}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-extrabold leading-tight tracking-tight md:text-[16px]">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium text-white/70 md:text-[14px]">
                          {s.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role picker — promoted from "Autres espaces" footer to a proper
          3-card section. After the consumer-led hero, this is where a
          vendor or rider finds their path. The "Je commande" card mirrors
          the hero CTA to make the parallel structure obvious. ─────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-16 md:px-8 md:pt-24 lg:px-12 lg:pt-32">
        <div className="border-t border-divider pt-8 md:pt-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
            Tu es ?
          </p>
          {/* Admin is intentionally NOT here — staff-only entry point, not a
              public role. Reach it directly at /admin/login. */}
          <ul className="mt-5 grid grid-cols-1 gap-3 md:mt-7 md:grid-cols-3">
            <RoleCard
              href="/restaurants"
              eyebrow="01"
              label="Je commande"
              sub="Mange chaud, livré en 30 min."
              tone="primary"
            />
            <RoleCard
              href="/vendre"
              eyebrow="02"
              label="Je vends mes plats"
              sub="Devenir vendeur TChopNow."
              tone="default"
            />
            <RoleCard
              href="/livrer"
              eyebrow="03"
              label="Je livre à moto"
              sub="Gagner en livrant dans ton quartier."
              tone="default"
            />
          </ul>
        </div>
      </section>

      {/* ── Trust + zones + FAQ + Site footer ──────────────────────
          Marketing-splash content blocks beyond the hero / role picker.
          Each section is a separate <section> so SEO crawlers and
          screen readers can navigate cleanly. ───────────────────── */}
      <TrustRow />
      <ServiceZones />
      <Faq />
      <SiteFooter />
    </main>
  );
}

/* ── Trust signals — 3 chips with lucide icons (matches the rest of
       the site's icon system: ConsumerTopNav, AdminTabs, etc.). Emoji
       icons were swapped out because they read as cheap/AI-generated
       on a marketing surface and clashed with the editorial aesthetic. */
function TrustRow() {
  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <TrustChip
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={2} />}
          label="Paiement sécurisé"
          sub="MTN MoMo + Orange Money"
        />
        <TrustChip
          icon={<Bike className="h-5 w-5" strokeWidth={2} />}
          label="Livraison 30 min"
          sub="Par moto dans ton quartier"
        />
        <TrustChip
          icon={<MessageCircle className="h-5 w-5" strokeWidth={2} />}
          label="Support WhatsApp"
          sub="On répond 7j/7"
        />
      </div>
    </section>
  );
}

function TrustChip({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-divider bg-chop-card-white p-5">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chop-red-light text-chop-red"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-extrabold leading-tight text-chop-ink md:text-[15px]">
          {label}
        </p>
        <p className="mt-1 text-[12px] font-medium leading-relaxed text-chop-ink-secondary md:text-[13px]">
          {sub}
        </p>
      </div>
    </div>
  );
}

/* ── Service zones ──────────────────────────────────────────────────── */
function ServiceZones() {
  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <div className="border-t border-divider pt-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
          On livre ici
        </p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
          Bonamoussadi <span className="text-chop-red">&</span> Makepe
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] font-medium leading-relaxed text-chop-ink-secondary md:text-[16px]">
          On démarre dans ces deux quartiers pendant la phase pilote. Élargissement progressif vers{' '}
          <strong>Bonapriso</strong>, <strong>Akwa</strong>, <strong>Bonanjo</strong>,{' '}
          <strong>Logbessou</strong> et la suite — inscris-toi pour être notifié dès que ton
          quartier ouvre.
        </p>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */
function Faq() {
  const QUESTIONS = [
    {
      q: 'Comment ça marche ?',
      a: 'Tu choisis un vendeur autour de toi, tu commandes en 3 taps, tu paies par MoMo. Un livreur récupère ta commande et te l’apporte à moto en 30 minutes.',
    },
    {
      q: 'Quelles zones livrez-vous ?',
      a: 'Pendant la phase pilote, on livre à Bonamoussadi et Makepe à Douala. On élargit progressivement vers d’autres quartiers de Douala.',
    },
    {
      q: 'Comment je paie ?',
      a: 'Uniquement par MTN Mobile Money ou Orange Money. Le paiement est traité par Campay (agrégateur régulé ANTIC + ART). Aucune carte bancaire requise, aucun paiement en espèces pour le moment.',
    },
    {
      q: 'Combien coûte la livraison ?',
      a: 'Les frais de livraison dépendent de la distance entre toi et le vendeur. Le montant exact s’affiche au checkout avant que tu valides — pas de surprise.',
    },
    {
      q: 'Que se passe-t-il si le restaurant refuse ma commande ?',
      a: 'Si le restaurant ne confirme pas dans les 60 secondes après ton paiement, la commande est annulée automatiquement et le montant est remboursé intégralement sur ton compte MoMo dans les 24 heures.',
    },
    {
      q: 'Comment devenir vendeur ou livreur ?',
      a: 'Vendeur : dépose ton dossier sur /vendre (validation sous 24h, commission seulement quand on te livre une commande). Livreur : /livrer (paie hebdomadaire chaque samedi 22h via MoMo, validation sous 4h, pas de caution).',
    },
  ];

  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <div className="border-t border-divider pt-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
          On répond
        </p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
          Questions <span className="text-chop-red">fréquentes.</span>
        </h2>

        {/* Native <details> for collapsible Q&A — zero JS, accessible by
            default, supports keyboard + screen-reader interaction. The
            chevron indicator is purely CSS via the [open] selector. */}
        <ul className="mt-8 divide-y divide-divider border-y border-divider">
          {QUESTIONS.map((item, i) => (
            <li key={i}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                  <span className="text-[15px] font-extrabold leading-snug text-chop-ink md:text-[17px]">
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chop-surface-gray text-[13px] font-bold text-chop-ink transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-chop-ink-secondary md:text-[15px]">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RoleCard({
  href,
  eyebrow,
  label,
  sub,
  tone,
}: {
  href: string;
  eyebrow: string;
  label: string;
  sub: string;
  tone: 'primary' | 'default';
}) {
  const isPrimary = tone === 'primary';
  return (
    <li>
      <Link
        href={href}
        className={
          isPrimary
            ? 'group relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-chop-red p-5 text-white shadow-card transition-shadow hover:shadow-elevated md:p-6'
            : 'group relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border-2 border-chop-ink/10 bg-chop-card-white p-5 text-chop-ink transition-colors hover:border-chop-ink hover:bg-chop-warm md:p-6'
        }
      >
        <span
          className={`font-mono text-[12px] font-bold tabular-nums ${
            isPrimary ? 'text-white/60' : 'text-chop-ink-secondary'
          }`}
        >
          {eyebrow}.
        </span>
        <div>
          <p className="text-[18px] font-extrabold leading-tight tracking-tight md:text-[20px]">
            {label}
          </p>
          <p
            className={`mt-1 text-[13px] font-medium ${
              isPrimary ? 'text-white/80' : 'text-chop-ink-secondary'
            } md:text-[14px]`}
          >
            {sub}
          </p>
        </div>
        <span
          aria-hidden
          className={`text-[18px] font-bold transition-transform group-hover:translate-x-1 ${
            isPrimary ? 'text-white' : 'text-chop-ink'
          }`}
        >
          →
        </span>
      </Link>
    </li>
  );
}
