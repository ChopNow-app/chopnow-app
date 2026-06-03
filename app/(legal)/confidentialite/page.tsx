import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité Tchop NoW — comment nous collectons, traitons et protégeons tes données personnelles (numéro WhatsApp, adresse, commandes).',
  alternates: { canonical: '/confidentialite' },
};

export default function ConfidentialitePage() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red">
          — Légal
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-[42px]">
          Politique de <span className="text-chop-red">confidentialité.</span>
        </h1>
        <p className="mt-3 text-[13px] text-chop-ink-secondary">
          Dernière mise à jour : 25 mai 2026 · Version 1.0 (pilote)
        </p>
      </header>

      <section>
        <h2 className="text-xl font-extrabold">Données collectées</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW collecte uniquement les données strictement nécessaires au fonctionnement du
          service :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-chop-ink">
          <li>
            <strong>Numéro de téléphone WhatsApp</strong> — pour l&apos;authentification par OTP et
            la communication entre acteurs.
          </li>
          <li>
            <strong>Nom d&apos;affichage</strong> — saisi optionnellement lors de l&apos;onboarding
            pour personnaliser le service.
          </li>
          <li>
            <strong>Adresses de livraison</strong> — jusqu&apos;à 3 adresses sauvegardées (quartier
            + point de repère).
          </li>
          <li>
            <strong>Position GPS</strong> — utilisée uniquement au moment de la commande pour
            calculer le rayon de livraison. Jamais stockée en historique.
          </li>
          <li>
            <strong>Historique des commandes</strong> — vendeur, plats, montant, statut, horodatage.
            Conservé pendant 12 mois pour la gestion des litiges.
          </li>
          <li>
            <strong>Numéro MoMo</strong> — uniquement pour les paiements et les remboursements.
            Stocké sous forme chiffrée.
          </li>
          <li>
            <strong>Données techniques</strong> — adresse IP, type d&apos;appareil, navigateur,
            événements d&apos;erreur. Utilisées exclusivement pour le diagnostic et la prévention de
            la fraude.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Comment nous utilisons tes données</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-chop-ink">
          <li>Exécuter les commandes et coordonner livreurs + vendeurs.</li>
          <li>Te contacter via WhatsApp en cas d&apos;incident de livraison.</li>
          <li>Améliorer le service (analyse d&apos;usage agrégée et anonymisée).</li>
          <li>
            Prévenir les fraudes et les usages abusifs (paiements contestés, comptes multiples).
          </li>
          <li>Respecter nos obligations légales (déclarations fiscales, demandes judiciaires).</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          <strong>Nous ne vendons jamais tes données</strong> et nous ne les partageons pas à des
          tiers à des fins publicitaires.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Partage avec des tiers</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Certaines données sont partagées avec nos prestataires techniques pour permettre le
          fonctionnement du service :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-chop-ink">
          <li>
            <strong>Twilio Inc.</strong> (États-Unis) — envoi des codes OTP WhatsApp.
          </li>
          <li>
            <strong>Campay (Maviance-affilié, Cameroun)</strong> — traitement des paiements MTN MoMo
            et Orange Money. Agrégateur régulé ANTIC + ART.
          </li>
          <li>
            <strong>Vercel Inc.</strong> (États-Unis) — hébergement de l&apos;application web (PWA).
          </li>
          <li>
            <strong>DigitalOcean LLC</strong> (États-Unis) — hébergement de l&apos;API backend et de
            la base de données pendant la phase pilote.
          </li>
          <li>
            <strong>Cloudflare Inc.</strong> (États-Unis) — protection anti-bot (Turnstile) sur
            l&apos;écran de connexion.
          </li>
          <li>
            <strong>Sentry / Grafana</strong> — journaux d&apos;erreurs et métriques de performance,
            sans données utilisateur identifiables (PII redactée côté client).
          </li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Chaque prestataire est contractuellement tenu de respecter la confidentialité et de ne
          traiter les données que pour l&apos;exécution du service confié.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Localisation et transferts</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Pendant la phase pilote, les serveurs principaux sont hébergés hors du Cameroun
          (États-Unis). Une migration vers une infrastructure plus proche de l&apos;Afrique de
          l&apos;Ouest est planifiée post-traction. Les transferts internationaux respectent les
          conditions imposées par la législation camerounaise en matière de protection des données
          personnelles.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Tes droits</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">Tu peux à tout moment :</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-chop-ink">
          <li>
            <strong>Accéder</strong> à tes données — depuis ton compte (
            <a href="/account" className="text-chop-red underline-offset-2 hover:underline">
              /account
            </a>
            ).
          </li>
          <li>
            <strong>Rectifier</strong> tes informations (nom, adresses, numéro MoMo) — depuis ton
            compte.
          </li>
          <li>
            <strong>Supprimer</strong> ton compte — envoie un email à{' '}
            <a
              href="mailto:contact@tchopnow.app"
              className="text-chop-red underline-offset-2 hover:underline"
            >
              contact@tchopnow.app
            </a>{' '}
            avec ton numéro. Suppression effective sous 30 jours, sauf obligations légales de
            conservation (historique de paiements : 10 ans).
          </li>
          <li>
            <strong>Exporter</strong> tes données dans un format portable — sur demande par email.
          </li>
          <li>
            <strong>Refuser</strong> les notifications push — paramétrable dans ton compte.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Cookies et stockage local</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW utilise un cookie HttpOnly (<code>chopnow_rt</code>) pour maintenir ta session
          de connexion et le stockage local du navigateur pour conserver temporairement ton panier
          en cours et tes préférences d&apos;interface. Aucun cookie publicitaire ou de tracking
          tiers n&apos;est utilisé.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Contact pour les questions de confidentialité</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Pour toute question sur le traitement de tes données ou pour exercer tes droits :{' '}
          <a
            href="mailto:contact@tchopnow.app"
            className="text-chop-red underline-offset-2 hover:underline"
          >
            contact@tchopnow.app
          </a>{' '}
          ou WhatsApp{' '}
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
    </article>
  );
}
