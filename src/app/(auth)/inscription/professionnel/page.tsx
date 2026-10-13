import type { Metadata } from "next";
import Link from "next/link";
import { RegisterProfessionalForm } from "@/components/auth/register-forms";

export const metadata: Metadata = { title: "Accès professionnel" };

export default function RegisterProPage() {
  return (
    <>
      <p className="eyebrow">Professionnels de l'horlogerie</p>
      <h1 className="mt-3 font-display text-5xl leading-none text-ink">Demande d'accès professionnel</h1>
      <ol className="mt-6 grid gap-3 text-sm text-slate sm:grid-cols-3">
        {["Créez votre compte", "Nous vérifions votre activité", "Souscrivez et accédez à la base"].map((s, i) => (
          <li key={s} className="border-t border-line-strong pt-3">
            <span className="serial mr-2 text-smoke">0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-10">
        <RegisterProfessionalForm />
      </div>
      <p className="mt-10 border-t border-line pt-6 text-sm text-slate">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-ink underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </>
  );
}
