import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/server/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form-fields";
import { Notice } from "@/components/ui/primitives";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = param((await searchParams).token) ?? "";
  if (!token) {
    return (
      <Notice tone="warn" title="Lien incomplet">
        Utilisez le lien reçu par email, ou{" "}
        <Link href="/mot-de-passe-oublie" className="underline">
          faites une nouvelle demande
        </Link>
        .
      </Notice>
    );
  }
  return (
    <>
      <h1 className="font-display text-5xl leading-none text-ink">Nouveau mot de passe</h1>
      <p className="mt-4 text-[15px] text-slate">Toutes vos sessions ouvertes seront déconnectées.</p>
      <ActionForm action={resetPassword} className="mt-8 space-y-5">
        <input type="hidden" name="token" value={token} />
        <Field label="Nouveau mot de passe" name="password" required hint="12 caractères minimum, avec au moins une lettre et un chiffre.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirmation" name="confirm" required>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg">
          Enregistrer
        </SubmitButton>
      </ActionForm>
    </>
  );
}
