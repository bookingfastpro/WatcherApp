import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Notice } from "@/components/ui/primitives";
import { param } from "@/lib/utils";
import { safeNextPath } from "@/lib/session-cookie";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(param(sp.next), "");
  return (
    <>
      <p className="eyebrow">Espace membre</p>
      <h1 className="mt-3 font-display text-5xl leading-none text-ink">Connexion</h1>
      <p className="mt-4 text-[15px] text-slate">Accédez à vos déclarations ou à votre espace professionnel.</p>
      <div className="mt-8 space-y-4">
        {param(sp.reinitialise) ? (
          <Notice tone="ok">Votre mot de passe a été modifié. Vous pouvez vous connecter.</Notice>
        ) : null}
        {param(sp.unverified) ? (
          <Notice tone="warn">Confirmez votre adresse email pour accéder à votre espace.</Notice>
        ) : null}
      </div>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <div className="mt-10 border-t border-line pt-6 text-sm text-slate">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-ink underline underline-offset-4">
          Déclarer une montre (gratuit)
        </Link>{" "}
        ·{" "}
        <Link href="/inscription/professionnel" className="font-medium text-ink underline underline-offset-4">
          Compte professionnel
        </Link>
      </div>
    </>
  );
}
