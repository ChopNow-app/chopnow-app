import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Bike, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { AnimateInView } from '@/components/AnimateInView';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
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

export default async function HomePage() {
  const t = await getTranslations('Splash');
  // STEPS keep their numeric eyebrows (01/02/03) hard-coded — they're
  // ornamental glyphs, not translatable copy. Titles + bodies come
  // from the messages bundle.
  const steps = (t.raw('steps') as Array<{ title: string; body: string }>).map((s, i) => ({
    n: String(i + 1).padStart(2, '0'),
    title: s.title,
    body: s.body,
  }));
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
            Tchop <span className="text-chop-red">NoW</span>
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <PwaInstallModal />
          </div>
        </div>
      </header>

      {/* ── Hero — stacked on mobile, 2-col on lg ───────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pt-10 md:px-8 md:pt-16 lg:px-12 lg:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14 xl:gap-20">
          {/* ── Left: editorial hero ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary duration-500 animate-in fade-in slide-in-from-bottom-2 md:text-[12px]">
              {t('locationEyebrow').split('·')[0]}
              <span className="text-chop-red">·</span>
              {t('locationEyebrow').split('·')[1]}
            </p>

            <h1 className="mt-3 text-[64px] font-extrabold leading-[0.92] tracking-[-0.04em] delay-100 duration-700 animate-in fade-in slide-in-from-bottom-4 md:text-[96px] lg:text-[120px] xl:text-[140px]">
              {t('heroLine1')}
              <br />
              {t('heroLine2')}
              <br />
              <span className="text-chop-red">{t('heroLine3')}</span>
            </h1>

            <p className="mt-5 max-w-[44ch] text-[15px] font-medium leading-[1.55] text-chop-ink-secondary delay-300 duration-500 animate-in fade-in slide-in-from-bottom-2 md:mt-6 md:max-w-[52ch] md:text-[17px] lg:text-[18px]">
              {t('subtitle')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 delay-500 duration-500 animate-in fade-in slide-in-from-bottom-2 md:mt-8">
              <Button asChild size="lg">
                <Link href="/restaurants">{t('ctaOrder')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">{t('ctaLogin')}</Link>
              </Button>
            </div>
          </div>

          {/* ── Right: food photo card — sits next to hero on lg+.
              Replaces the editorial red "Le Pacte" poster (now lives as
              a full-width band below) with an actual dish from the
              local cuisine: Eru + Fufu — quintessential Cameroon. The
              poster card was identity-strong but commodity from a
              category-positioning standpoint; the photo makes the
              splash say "ChopNow = Douala food" at a glance. ────── */}
          <div className="delay-200 duration-700 animate-in fade-in zoom-in-95 lg:sticky lg:top-8">
            <div className="relative overflow-hidden rounded-3xl shadow-elevated">
              {/* Eru (legume stew) + Fufu — a classic Cameroon dish.
                  Photo by Unsplash contributor, free for commercial use.
                  aspect-[4/5] matches the previous Le Pacte card height
                  on lg+ so the hero's 2-col layout stays balanced. */}
              <Image
                src="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1600&q=85"
                alt={t('foodCardDish')}
                width={1600}
                height={2000}
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="aspect-[4/5] h-auto w-full object-cover"
              />
              {/* Floating brand chip top-left. Reuses the chop-red
                  palette so the photo + brand sit together. */}
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-chop-red px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-card backdrop-blur-sm md:left-5 md:top-5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
                {t('foodCardEyebrow')}
              </span>
              {/* Caption at bottom with gradient mask so text is
                  readable on any photo. Names the dish — "the app
                  knows our food" signal that beats a generic stock
                  photo with no caption. */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white md:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 md:text-[11px]">
                  {t('foodCardCaption')}
                </p>
                <p className="mt-1 text-[20px] font-extrabold leading-tight tracking-tight md:text-[24px]">
                  {t('foodCardDish')}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-white/80 md:text-[13px]">
                  {t('foodCardVendor')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Le Pacte — horizontal red band, full-width.
          Moved out of the hero's right column when the food photo took
          its place. Keeps the brand-pact content + 3-step explainer
          but as a separate "manifesto" beat between hero and role
          picker, which actually feels more deliberate — readers parse
          hero → photo → "how it works" → "who are you?" in order. */}
      <AnimateInView
        as="section"
        className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-20 md:px-8 lg:px-12"
      >
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
            className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[1fr_2fr] md:items-center md:gap-10 md:px-10 md:py-12 lg:gap-14 lg:px-14 lg:py-14">
            {/* Left: badge + heading */}
            <div>
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                {t('pactBadge')}
              </span>
              <h2 className="mt-3 text-[34px] font-extrabold leading-[0.95] tracking-tight md:text-[40px] lg:text-[44px]">
                {t('pactHeadlineL1')}
                <br />
                {t('pactHeadlineL2')}
              </h2>
            </div>

            {/* Right: 3 steps, 3-col on md+, stacked on mobile */}
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
              {steps.map((s) => (
                <li key={s.n}>
                  <p className="font-mono text-[13px] font-bold tabular-nums text-white/55 md:text-[14px]">
                    {s.n}.
                  </p>
                  <p className="mt-2 text-[16px] font-extrabold leading-tight tracking-tight md:text-[17px]">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-white/75 md:text-[14px]">
                    {s.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AnimateInView>

      {/* ── Role picker — promoted from "Autres espaces" footer to a proper
          3-card section. After the consumer-led hero, this is where a
          vendor or rider finds their path.
          Asymmetric lg grid: the "Je commande" card gets ~1.5x width so
          the section reads as "primary CTA + two affordances" instead of
          three equal options. Fills wide-screen space better and signals
          which role the marketing surface is actually optimizing for. */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-16 md:px-8 md:pt-24 lg:px-12 lg:pt-32">
        <div className="border-t border-divider pt-8 md:pt-12">
          <AnimateInView>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
              {t('rolesEyebrow')}
            </p>
            <h2 className="mt-3 max-w-[18ch] text-[34px] font-extrabold leading-[0.95] tracking-tight md:text-[44px] lg:text-[52px]">
              {t('rolesHeadingL1')} <span className="text-chop-red">{t('rolesHeadingL2')}</span>
            </h2>
          </AnimateInView>

          {/* Admin is intentionally NOT here — staff-only entry point, not a
              public role. Reach it directly at /admin/login. */}
          <ul className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 md:gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">
            <AnimateInView as="li" delay={100}>
              <RoleCard
                href="/restaurants"
                eyebrow="01"
                label={t('roleConsumerLabel')}
                sub={t('roleConsumerSub')}
                tone="primary"
              />
            </AnimateInView>
            <AnimateInView as="li" delay={220}>
              <RoleCard
                href="/vendre"
                eyebrow="02"
                label={t('roleVendorLabel')}
                sub={t('roleVendorSub')}
                tone="default"
              />
            </AnimateInView>
            <AnimateInView as="li" delay={340}>
              <RoleCard
                href="/livrer"
                eyebrow="03"
                label={t('roleRiderLabel')}
                sub={t('roleRiderSub')}
                tone="default"
              />
            </AnimateInView>
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

/* ── Trust signals — promoted from cramped chips to a full editorial
       section with eyebrow + headline + three big "pillar" cards.
       Each card now has: large icon block on top, prominent title,
       wider body, and a faint ordinal (01/02/03) that anchors the
       visual rhythm with the role picker below. The asymmetry comes
       from typography weight, not grid columns — still 3 equal cards
       so the layout stays scannable. */
async function TrustRow() {
  const t = await getTranslations('Splash');
  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <div className="border-t border-divider pt-8 md:pt-12">
        <AnimateInView>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
            {t('trustEyebrow')}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-[34px] font-extrabold leading-[0.95] tracking-tight md:text-[44px] lg:text-[52px]">
            {t('trustHeadingL1')} <span className="text-chop-red">{t('trustHeadingL2')}</span>
          </h2>
        </AnimateInView>

        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-5">
          <AnimateInView delay={100}>
            <TrustPillar
              ordinal="01"
              icon={<ShieldCheck className="h-7 w-7" strokeWidth={2} />}
              label={t('trustPaymentLabel')}
              sub={t('trustPaymentSub')}
            />
          </AnimateInView>
          <AnimateInView delay={220}>
            <TrustPillar
              ordinal="02"
              icon={<Bike className="h-7 w-7" strokeWidth={2} />}
              label={t('trustDeliveryLabel')}
              sub={t('trustDeliverySub')}
            />
          </AnimateInView>
          <AnimateInView delay={340}>
            <TrustPillar
              ordinal="03"
              icon={<MessageCircle className="h-7 w-7" strokeWidth={2} />}
              label={t('trustSupportLabel')}
              sub={t('trustSupportSub')}
            />
          </AnimateInView>
        </div>
      </div>
    </section>
  );
}

function TrustPillar({
  ordinal,
  icon,
  label,
  sub,
}: {
  ordinal: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="group relative flex h-full min-h-[200px] flex-col gap-6 overflow-hidden rounded-3xl border border-divider bg-chop-card-white p-6 transition-all hover:border-chop-ink/20 hover:shadow-elevated motion-safe:hover:-translate-y-0.5 md:min-h-[240px] md:p-8">
      {/* Watermark ordinal — same rhythm as RoleCard so the two sections
          read as a coordinated pair. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-2 select-none text-[120px] font-extrabold leading-none tracking-tighter text-chop-ink/[0.04] md:-right-6 md:-top-4 md:text-[160px]"
      >
        {ordinal}
      </span>

      <div className="relative flex items-center justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-chop-red-light text-chop-red transition-colors group-hover:bg-chop-red group-hover:text-white md:h-16 md:w-16"
        >
          {icon}
        </span>
        <span className="font-mono text-[12px] font-bold tabular-nums text-chop-ink-secondary md:text-[13px]">
          {ordinal}.
        </span>
      </div>

      <div className="relative">
        <p className="text-[20px] font-extrabold leading-tight tracking-tight text-chop-ink md:text-[22px] lg:text-[24px]">
          {label}
        </p>
        <p className="mt-2 max-w-[28ch] text-[14px] font-medium leading-relaxed text-chop-ink-secondary md:text-[15px]">
          {sub}
        </p>
      </div>
    </div>
  );
}

/* ── Service zones ──────────────────────────────────────────────────── */
async function ServiceZones() {
  const t = await getTranslations('Splash');
  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <AnimateInView className="border-t border-divider pt-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
          {t('zonesEyebrow')}
        </p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
          Bonamoussadi <span className="text-chop-red">&</span> Makepe
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] font-medium leading-relaxed text-chop-ink-secondary md:text-[16px]">
          {t.rich('zonesBody', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </AnimateInView>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */
async function Faq() {
  const t = await getTranslations('FAQ');
  const tSplash = await getTranslations('Splash');
  // 6 Q/A pairs keyed q1..q6 / a1..a6. The numeric scheme keeps the
  // ordering stable across translations and lets a future "/admin/faq"
  // CMS-style screen reorder them by editing this array instead of the
  // JSX block below.
  const QUESTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`q${n}` as 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6'),
    a: t(`a${n}` as 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6'),
  }));

  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl px-5 md:mt-24 md:px-8 lg:px-12">
      <AnimateInView className="border-t border-divider pt-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary md:text-[12px]">
          {tSplash('faqEyebrow')}
        </p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
          {tSplash('faqHeadline1')} <span className="text-chop-red">{tSplash('faqHeadline2')}</span>
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
      </AnimateInView>
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
    <Link
      href={href}
      className={
        isPrimary
          ? 'group relative flex h-full min-h-[200px] flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-chop-red p-6 text-white shadow-card transition-all hover:shadow-elevated md:min-h-[260px] md:p-8 lg:min-h-[300px] lg:p-10'
          : 'group relative flex h-full min-h-[200px] flex-col justify-between gap-8 overflow-hidden rounded-3xl border-2 border-chop-ink/10 bg-chop-card-white p-6 text-chop-ink transition-all hover:border-chop-ink hover:bg-chop-warm hover:shadow-elevated motion-safe:hover:-translate-y-0.5 md:min-h-[260px] md:p-8 lg:min-h-[300px] lg:p-10'
      }
    >
      {/* Giant ornamental eyebrow number that fills the empty top-right
            of the card. Subtle by opacity; reinforces the 01/02/03
            rhythm without competing with the label. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-4 -top-2 select-none font-extrabold leading-none tracking-tighter md:-right-6 md:-top-4 ${
          isPrimary
            ? 'text-[140px] text-white/[0.08] md:text-[180px] lg:text-[220px]'
            : 'text-[140px] text-chop-ink/[0.05] md:text-[180px] lg:text-[220px]'
        }`}
      >
        {eyebrow}
      </span>

      <span
        className={`relative font-mono text-[12px] font-bold tabular-nums md:text-[13px] ${
          isPrimary ? 'text-white/70' : 'text-chop-ink-secondary'
        }`}
      >
        {eyebrow}.
      </span>
      <div className="relative">
        <p className="text-[22px] font-extrabold leading-[1.05] tracking-tight md:text-[26px] lg:text-[30px]">
          {label}
        </p>
        <p
          className={`mt-2 max-w-[28ch] text-[14px] font-medium leading-relaxed md:mt-3 md:text-[15px] lg:text-[16px] ${
            isPrimary ? 'text-white/85' : 'text-chop-ink-secondary'
          }`}
        >
          {sub}
        </p>
      </div>
      <span
        aria-hidden
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[20px] font-bold transition-transform motion-safe:group-hover:translate-x-1 md:h-12 md:w-12 md:text-[22px] ${
          isPrimary
            ? 'bg-white/15 text-white group-hover:bg-white/25'
            : 'bg-chop-ink/5 text-chop-ink group-hover:bg-chop-ink group-hover:text-white'
        }`}
      >
        →
      </span>
    </Link>
  );
}
