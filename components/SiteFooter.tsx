import Link from 'next/link';
import { MessageCircle, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// Site-wide footer for the marketing splash + the (legal) routes.
// Intentionally NOT shown on app surfaces (/restaurants, /cart, /orders,
// /account, etc.) — those are the in-app experience where a 3-column
// link footer would be noise. The bottom-nav handles wayfinding there.
//
// 4 columns on lg+, stack on mobile. Brand left, action links centre,
// social right, legal bar at the bottom.
//
// Pre-RCCM honesty: the legal links go to stub pages that disclose
// "entité en cours d'enregistrement" rather than naming a SARL/SAS we
// haven't actually registered.

const LINK_CLS =
  'text-[13px] font-medium text-chop-ink-secondary transition-colors hover:text-chop-ink hover:underline underline-offset-4';

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  return (
    <footer className="relative z-10 mt-16 border-t border-divider bg-chop-warm md:mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-2 md:px-8 md:py-14 lg:grid-cols-4 lg:gap-8 lg:px-12">
        {/* ── Brand block ────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Link
            href="/"
            className="inline-block text-[15px] font-extrabold uppercase tracking-[0.18em] text-chop-ink md:text-[17px]"
          >
            Tchop <span className="text-chop-red">NoW</span>
          </Link>
          <p className="mt-3 max-w-[28ch] text-[13px] font-medium leading-relaxed text-chop-ink-secondary">
            {t('brandTagline')}
          </p>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-chop-ink-secondary">
            {t('pilotZone')}
          </p>
        </div>

        {/* ── Acteurs links ──────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-ink">
            {t('joinHeading')}
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/restaurants" className={LINK_CLS}>
                {t('linkOrder')}
              </Link>
            </li>
            <li>
              <Link href="/vendre" className={LINK_CLS}>
                {t('linkBecomeVendor')}
              </Link>
            </li>
            <li>
              <Link href="/livrer" className={LINK_CLS}>
                {t('linkBecomeRider')}
              </Link>
            </li>
            <li>
              <Link href="/statut" className={LINK_CLS}>
                {t('linkCheckStatus')}
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Légal ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-ink">
            {t('legalHeading')}
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/mentions-legales" className={LINK_CLS}>
                {t('linkLegal')}
              </Link>
            </li>
            <li>
              <Link href="/cgu" className={LINK_CLS}>
                {t('linkTerms')}
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className={LINK_CLS}>
                {t('linkPrivacy')}
              </Link>
            </li>
          </ul>
        </div>

        {/* ── Contact + social ──────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-ink">
            {t('contactHeading')}
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href="https://wa.me/237652007684"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLS + ' inline-flex items-center gap-2'}
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="mailto:contact@tchopnow.app"
                className={LINK_CLS + ' inline-flex items-center gap-2'}
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                contact@tchopnow.app
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div className="border-t border-divider">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-[11px] font-medium text-chop-ink-secondary md:flex-row md:px-8 md:py-6 lg:px-12">
          <p>{t('copyright')}</p>
          <p>{t('legalEntity')}</p>
        </div>
      </div>
    </footer>
  );
}
