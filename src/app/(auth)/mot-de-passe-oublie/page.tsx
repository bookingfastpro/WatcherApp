import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/server/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form-fields";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-5xl leading-none text-ink">Mot de passe oublié</h1>
      <p className="mt-4 text-[15px] text-slate">
        Indiquez votre adresse email : si un compte y est associé, vous recevrez un lien de réinitialisation valable une heure.
      </p>
      <ActionForm action={requestPasswordReset} className="mt-8 space-y-5" resetOnSuccess>
        <Field label="Adresse email" name="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingLabel="Envoi…">
          Envoyer le lien
        </SubmitButton>
      </ActionForm>
      <p className="mt-8 text-sm">
        <Link href="/connexion" className="text-slate underline underline-offset-4 hover:text-ink">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
