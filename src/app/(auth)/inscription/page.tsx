import type { Metadata } from "next";
import Link from "next/link";
import { RegisterIndividualForm } from "@/components/auth/register-forms";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <>
      <p className="eyebrow">Propriétaires · gratuit</p>
      <h1 className="mt-3 font-display text-5xl leading-none text-ink">Créer un compte</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-slate">
        Votre compte vous permet de déclarer une montre volée, de joindre vos justificatifs et de suivre
        la vérification de votre déclaration.
      </p>
      <div className="mt-10">
        <RegisterIndividualForm />
      </div>
      <p className="mt-10 border-t border-line pt-6 text-sm text-slate">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-ink underline underline-offset-4">
          Se connecter
        </Link>
        . Vous êtes un professionnel ?{" "}
        <Link href="/inscription/professionnel" className="font-medium text-ink underline underline-offset-4">
          Demander un accès pro
        </Link>
        .
      </p>
    </>
  );
}
