"use client";

import Link from "next/link";
import { login, resendVerification } from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/form-fields";
import { FieldErrorsContext } from "@/components/ui/form-context";
import { ActionForm, SubmitButton, useManualAction } from "@/components/ui/action-form";

export function LoginForm({ next }: { next?: string }) {
  const { state, isPending, submit } = useManualAction(login);
  const unverifiedEmail = state.data?.unverified ? String(state.data.email ?? "") : null;

  return (
    <div className="space-y-6">
      <FieldErrorsContext.Provider value={state.fieldErrors ?? {}}>
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!isPending) submit(e.currentTarget);
          }}
        >
          {state.status === "error" && state.message ? (
            <div role="alert" className="border-l-2 border-alert bg-alert-soft px-4 py-3 text-sm text-alert">
              {state.message}
            </div>
          ) : null}
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Adresse email" name="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Mot de passe" name="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <div className="flex items-center justify-between">
            <Link href="/mot-de-passe-oublie" className="text-sm text-slate underline-offset-4 hover:text-ink hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <SubmitButton className="w-full" size="lg" pendingLabel="Connexion…" pending={isPending}>
            Se connecter
          </SubmitButton>
        </form>
      </FieldErrorsContext.Provider>

      {unverifiedEmail ? (
        <ActionForm action={resendVerification} className="border border-line bg-paper p-5">
          <p className="text-sm text-graphite">Vous n'avez pas reçu l'email de confirmation ?</p>
          <input type="hidden" name="email" value={unverifiedEmail} />
          <SubmitButton variant="secondary" size="sm" className="mt-3">
            Renvoyer l'email
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}
