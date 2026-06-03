import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions générales d'utilisation de Tchop NoW — règles de la plateforme de livraison de nourriture à Douala, Cameroun.",
  alternates: { canonical: '/cgu' },
};

export default function CguPage() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red">
          — Légal
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-[42px]">
          Conditions <span className="text-chop-red">d&apos;utilisation.</span>
        </h1>
        <p className="mt-3 text-[13px] text-chop-ink-secondary">
          Dernière mise à jour : 25 mai 2026 · Version 1.0 (pilote)
        </p>
      </header>

      <section>
        <h2 className="text-xl font-extrabold">1. Objet</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;usage du
          service Tchop NoW — application web mobile (PWA) accessible à l&apos;adresse{' '}
          <strong>app.tchopnow.app</strong>. Tchop NoW met en relation trois acteurs :{' '}
          <strong>Consommateurs</strong> (personnes commandant de la nourriture),{' '}
          <strong>Vendeurs</strong> (restaurants, maquis, cuisines maison référencés) et{' '}
          <strong>Livreurs</strong> (transporteurs à moto, vélo ou à pied).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">2. Acceptation</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          L&apos;utilisation de Tchop NoW implique l&apos;acceptation pleine et entière des
          présentes CGU. L&apos;utilisateur les accepte au premier usage de la plateforme. En cas de
          désaccord, l&apos;utilisateur s&apos;abstient d&apos;utiliser le service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">3. Inscription et authentification</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          L&apos;inscription se fait par numéro WhatsApp, via code OTP à 6 chiffres envoyé sur
          WhatsApp. Aucun mot de passe n&apos;est requis. Le numéro fourni doit appartenir à
          l&apos;utilisateur — toute usurpation expose à la suspension immédiate du compte.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">4. Commandes et paiement</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Pendant la phase pilote, le paiement s&apos;effectue exclusivement par{' '}
          <strong>MTN Mobile Money</strong> ou <strong>Orange Money</strong>, traités par notre
          prestataire agrégateur Campay (régulé ANTIC + ART, Cameroun). Aucun paiement à la
          livraison n&apos;est accepté.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Une fois la commande validée par le restaurant, elle ne peut plus être annulée par le
          consommateur sans frais. En cas de refus du restaurant dans les 60 secondes suivant la
          confirmation de paiement, la commande est annulée automatiquement et le montant est
          intégralement remboursé sur le même compte MoMo dans les 24 heures.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">5. Livraison</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW vise un délai de livraison de 30 minutes à partir de la prise en charge de la
          commande par le livreur. Ce délai est indicatif et peut varier selon les conditions de
          trafic, météorologiques ou opérationnelles.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          La zone de service actuelle est limitée à <strong>Bonamoussadi</strong> et{' '}
          <strong>Makepe</strong> à Douala (pilote). L&apos;élargissement progressif vers
          d&apos;autres quartiers est notifié sur la plateforme.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">6. Responsabilités</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW agit comme intermédiaire technique. La qualité, la fraîcheur, l&apos;hygiène et
          la conformité de la nourriture vendue relèvent de la responsabilité exclusive du{' '}
          <strong>Vendeur</strong>. Le bon déroulement de la livraison (intégrité du colis,
          ponctualité) relève de la responsabilité du <strong>Livreur</strong>.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW ne saurait être tenu responsable des dommages directs ou indirects résultant
          d&apos;un manquement à ces responsabilités par les vendeurs ou les livreurs. Un mécanisme
          de réclamation est disponible via WhatsApp à{' '}
          <a
            href="https://wa.me/237652007684"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chop-red underline-offset-2 hover:underline"
          >
            +237 652 007 684
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">7. Comportement de l&apos;utilisateur</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          L&apos;utilisateur s&apos;engage à ne pas : (a) usurper l&apos;identité d&apos;un tiers ;
          (b) tenter d&apos;accéder à des comptes qui ne sont pas le sien ; (c) utiliser la
          plateforme à des fins frauduleuses ou illégales ; (d) publier des contenus diffamatoires,
          racistes, ou portant atteinte à l&apos;ordre public.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">8. Suspension et résiliation</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW se réserve le droit de suspendre ou résilier tout compte en cas de violation des
          présentes CGU, d&apos;activité suspecte (fraude, paiements contestés) ou d&apos;atteinte à
          la communauté de la plateforme.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">9. Évolution des CGU</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW peut modifier les présentes CGU pour refléter l&apos;évolution du service.
          L&apos;utilisateur est informé par notification dans l&apos;application au moins 15 jours
          avant l&apos;entrée en vigueur. La poursuite de l&apos;usage de la plateforme vaut
          acceptation des nouvelles CGU.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">10. Loi applicable et juridiction</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Les présentes CGU sont régies par le droit camerounais. Tout litige relève des tribunaux
          de Douala.
        </p>
      </section>
    </article>
  );
}
