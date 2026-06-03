import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales de Tchop NoW — éditeur, hébergement, propriété intellectuelle. Service de livraison de nourriture à Douala, Cameroun.',
  alternates: { canonical: '/mentions-legales' },
};

// Pre-RCCM honesty: this page names the founder + describes the
// in-process legal entity registration. Once RCCM + NIU lands, swap
// the "exploité par" block for the formal SARL/SAS denomination.
export default function MentionsLegalesPage() {
  return (
    <article className="space-y-8">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red">
          — Légal
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-[42px]">
          Mentions <span className="text-chop-red">légales.</span>
        </h1>
        <p className="mt-3 text-[13px] text-chop-ink-secondary">
          Dernière mise à jour : 25 mai 2026
        </p>
      </header>

      <section>
        <h2 className="text-xl font-extrabold">Éditeur</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Tchop NoW est un service de mise en relation entre des vendeurs de nourriture camerounais
          (cuisines maison, maquis, restaurants), des livreurs à moto, et des consommateurs résidant
          à Douala.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Le service est actuellement exploité, dans le cadre d&apos;un pilote, par{' '}
          <strong>Andre Liar Kanmegne Tabouguie</strong> sous la dénomination commerciale{' '}
          <strong>Tchop NoW</strong>. L&apos;entité légale (SARL ou SAS) est en cours
          d&apos;enregistrement auprès du RCCM (Registre du Commerce et du Crédit Mobilier) et de la
          DGI (NIU). Cette page sera mise à jour avec la dénomination formelle dès la finalisation
          des formalités.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Contact</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-chop-ink">
          <li>
            Email :{' '}
            <a
              href="mailto:contact@tchopnow.app"
              className="text-chop-red underline-offset-2 hover:underline"
            >
              contact@tchopnow.app
            </a>
          </li>
          <li>
            WhatsApp :{' '}
            <a
              href="https://wa.me/237652007684"
              target="_blank"
              rel="noopener noreferrer"
              className="text-chop-red underline-offset-2 hover:underline"
            >
              +237 652 007 684
            </a>
          </li>
          <li>Adresse : Douala, Cameroun (siège en cours d&apos;immatriculation)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Directeur de la publication</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Andre Liar Kanmegne Tabouguie, fondateur de Tchop NoW.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Hébergement</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          L&apos;application web (PWA) est hébergée par <strong>Vercel Inc.</strong>, 440 N Barranca
          Ave #4133, Covina, CA 91723, États-Unis —{' '}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chop-red underline-offset-2 hover:underline"
          >
            vercel.com
          </a>
          .
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          L&apos;API backend et la base de données sont hébergées sur{' '}
          <strong>DigitalOcean LLC</strong>, 101 Ave of the Americas, 10th Floor, New York, NY
          10013, États-Unis (pendant la phase pilote ; migration vers une infrastructure au plus
          proche de l&apos;Afrique de l&apos;Ouest planifiée post-traction).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Propriété intellectuelle</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          La marque <strong>Tchop NoW</strong>, son logo (stopwatch dans le wordmark NOW, palette
          rouge/noir/blanc) et l&apos;ensemble du contenu rédactionnel, graphique et code applicatif
          sont la propriété exclusive de l&apos;éditeur. Toute reproduction, totale ou partielle,
          sans autorisation écrite préalable est interdite.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Les photos des vendeurs et des plats publiées sur la plateforme appartiennent à leurs
          propriétaires respectifs et sont publiées avec leur consentement dans le cadre du
          référencement Tchop NoW.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Données personnelles</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          La collecte et le traitement des données personnelles (numéro WhatsApp, adresse de
          livraison, historique de commande) sont décrits dans la{' '}
          <a href="/confidentialite" className="text-chop-red underline-offset-2 hover:underline">
            Politique de confidentialité
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Loi applicable</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-chop-ink">
          Les présentes mentions légales sont régies par le droit camerounais. Tout litige relatif à
          leur interprétation ou exécution relève de la compétence exclusive des tribunaux de
          Douala.
        </p>
      </section>
    </article>
  );
}
