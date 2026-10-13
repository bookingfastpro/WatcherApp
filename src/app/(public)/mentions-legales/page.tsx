import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" updated="[date]">
      <section>
        <h2>Éditeur</h2>
        <p>[Raison sociale] — [forme juridique] au capital de [montant] — [adresse] — RCS [ville] [numéro] — TVA [numéro].</p>
        <p>Directeur de la publication : [nom]. Contact : [email].</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>[Nom de l'hébergeur] — [adresse] — [téléphone].</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les marques horlogères citées dans les déclarations appartiennent à leurs titulaires respectifs et ne sont mentionnées
          qu'à des fins d'identification. La plateforme n'est affiliée à aucune de ces marques.
        </p>
      </section>
    </LegalPage>
  );
}
