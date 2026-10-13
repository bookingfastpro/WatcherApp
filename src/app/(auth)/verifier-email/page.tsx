import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmail } from "@/server/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Notice } from "@/components/ui/primitives";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Confirmation de l'adresse email" };

/**
 * La confirmation se fait par un clic explicite (POST) et non à l'ouverture du lien :
 * les antivirus de messagerie qui pré-visitent les liens ne consomment pas le jeton.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = param((await searchParams).token) ?? "";
  if (!token) {
    return (
      <Notice tone="warn" title="Lien incomplet">
        Utilisez le lien reçu par email. <Link href="/connexion" className="underline">Retour à la connexion</Link>
      </Notice>
    );
  }
  return (
    <>
      <h1 className="font-display text-5xl leading-none text-ink">Confirmez votre adresse</h1>
      <p className="mt-4 text-[15px] text-slate">Une dernière étape pour activer votre compte.</p>
      <ActionForm action={verifyEmail} className="mt-8">
        <input type="hidden" name="token" value={token} />
        <SubmitButton className="w-full" size="lg" pendingLabel="Activation…">
          Activer mon compte
        </SubmitButton>
      </ActionForm>
    </>
  );
}
