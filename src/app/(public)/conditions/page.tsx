import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="[date]">
      <section>
        <h2>Objet</h2>
        <p>
          La plateforme permet aux propriétaires de déclarer une montre volée et aux professionnels vérifiés de consulter les
          caractéristiques des montres déclarées, afin de prévenir le recel. Elle ne se substitue ni à un dépôt de plainte, ni
          aux autorités, et ne constitue pas une preuve de propriété.
        </p>
      </section>
      <section>
        <h2>Déclarations</h2>
        <ul>
          <li>Le déclarant certifie sur l'honneur l'exactitude des informations et sa qualité de propriétaire ou de représentant.</li>
          <li>Toute déclaration mensongère peut engager la responsabilité civile et pénale de son auteur [références à valider].</li>
          <li>La plateforme peut demander des justificatifs, refuser ou retirer une déclaration.</li>
        </ul>
      </section>
      <section>
        <h2>Accès professionnel</h2>
        <ul>
          <li>L'accès est réservé aux professionnels dont l'activité a été vérifiée, disposant d'un abonnement actif.</li>
          <li>Les recherches doivent être effectuées dans le cadre d'une transaction, reprise, réparation ou expertise réelle.</li>
          <li>Toute extraction, copie systématique, revente ou réutilisation des données est interdite et entraîne la suspension du compte.</li>
          <li>Un résultat négatif ne garantit pas l'origine licite d'une montre.</li>
        </ul>
      </section>
      <section>
        <h2>Abonnement</h2>
        <p>[Conditions de souscription, de renouvellement, de résiliation et de remboursement — à compléter. Délai de grâce en cas d'incident de paiement.]</p>
      </section>
      <section>
        <h2>Responsabilité</h2>
        <p>[Limitations de responsabilité — à rédiger par un juriste.]</p>
      </section>
      <section>
        <h2>Droit applicable</h2>
        <p>[Droit français — juridiction compétente à préciser.]</p>
      </section>
    </LegalPage>
  );
}
