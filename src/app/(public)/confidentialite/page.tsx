import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="[date]">
      <section>
        <h2>Responsable du traitement</h2>
        <p>[Raison sociale], [forme juridique], [adresse], immatriculée sous le n° [SIREN]. Contact : [email du DPO / contact RGPD].</p>
      </section>
      <section>
        <h2>Données traitées et finalités</h2>
        <ul>
          <li><strong>Compte</strong> (nom, prénom, email, téléphone facultatif) : gestion du compte et communication relative aux déclarations. Base légale : exécution du contrat.</li>
          <li><strong>Déclaration de vol</strong> (caractéristiques de la montre, date et lieu du vol, circonstances, références de plainte, justificatifs) : vérification et diffusion restreinte des caractéristiques de la montre aux professionnels vérifiés. Base légale : [intérêt légitime / exécution du contrat — à qualifier].</li>
          <li><strong>Données professionnelles</strong> (entreprise, immatriculation, justificatifs) : vérification de l'activité et gestion de l'abonnement. Base légale : exécution du contrat.</li>
          <li><strong>Journaux de recherche et d'accès</strong> : sécurité, prévention de l'extraction de données et de la fraude, traçabilité. Base légale : intérêt légitime. Les adresses IP sont pseudonymisées.</li>
          <li><strong>Facturation</strong> : traitée par Stripe (sous-traitant). Base légale : obligation légale et exécution du contrat.</li>
        </ul>
      </section>
      <section>
        <h2>Données relatives aux infractions</h2>
        <p>
          Les déclarations de vol et références de plainte peuvent constituer des données relatives à des infractions
          (article 10 du RGPD, article 46 de la loi Informatique et Libertés). [Analyse juridique requise : fondement
          permettant ce traitement, éventuelles formalités, mesures de sécurité renforcées.]
        </p>
      </section>
      <section>
        <h2>Destinataires</h2>
        <ul>
          <li>L'équipe de vérification de la plateforme (accès journalisé).</li>
          <li>Les professionnels vérifiés et abonnés : <strong>uniquement</strong> les caractéristiques de la montre et les photos autorisées, jamais l'identité ni les coordonnées du propriétaire, ni la plainte ou les factures.</li>
          <li>Les autorités compétentes, sur réquisition ou dans le cadre d'une restitution.</li>
          <li>Sous-traitants techniques : hébergeur [nom, localisation], stockage [nom, localisation], emailing [nom], Stripe.</li>
        </ul>
      </section>
      <section>
        <h2>Durées de conservation</h2>
        <ul>
          <li>Compte : pendant la durée d'utilisation, puis [durée] après la dernière activité.</li>
          <li>Déclarations : [durée à définir, ex. jusqu'à la restitution + délai de prescription applicable].</li>
          <li>Journaux de recherche : 365 jours par défaut (paramétrable). Journal d'audit : 3 ans par défaut (paramétrable).</li>
          <li>Données de facturation : 10 ans (obligation comptable).</li>
        </ul>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité.
          L'export de vos données et la demande de suppression sont disponibles dans les paramètres de votre compte.
          Vous pouvez également écrire à [email]. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          La plateforme n'utilise qu'un cookie strictement nécessaire (session d'authentification). Aucun cookie publicitaire
          ni de mesure d'audience tiers n'est déposé ; aucun consentement n'est donc requis à ce titre.
        </p>
      </section>
      <section>
        <h2>Sécurité</h2>
        <p>
          Chiffrement des échanges (HTTPS), mots de passe hachés (Argon2id), stockage privé des documents, contrôle d'accès
          côté serveur, journalisation des accès sensibles, limitation du débit des requêtes.
        </p>
      </section>
    </LegalPage>
  );
}
