"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { registerIndividual, registerProfessional } from "@/server/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Fieldset, Input, Select } from "@/components/ui/form-fields";
import { ACTIVITY_LABEL } from "@/lib/labels";
import { COUNTRIES } from "@/lib/countries";

function Registered() {
  return (
    <div className="border border-line bg-paper p-8 text-center fade-in">
      <MailCheck className="mx-auto size-8 text-ink" aria-hidden />
      <h2 className="mt-5 font-display text-3xl text-ink">Vérifiez votre boîte mail</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate">
        Un lien de confirmation vient de vous être envoyé. Il est valable 48 heures.
        Pensez à consulter vos courriers indésirables.
      </p>
      <Link href="/connexion" className="mt-6 inline-block text-sm font-medium text-ink underline underline-offset-4">
        Aller à la connexion
      </Link>
    </div>
  );
}

function Consents() {
  return (
    <div className="space-y-3 border-t border-line pt-6">
      <Checkbox name="acceptTerms" required>
        J'accepte les{" "}
        <Link href="/conditions" target="_blank" className="underline underline-offset-2">
          conditions d'utilisation
        </Link>
        .
      </Checkbox>
      <Checkbox name="acceptPrivacy" required>
        J'ai pris connaissance de la{" "}
        <Link href="/confidentialite" target="_blank" className="underline underline-offset-2">
          politique de confidentialité
        </Link>{" "}
        et du traitement de mes données.
      </Checkbox>
      <Checkbox name="marketingConsent">
        J'accepte de recevoir des informations sur les évolutions du service (facultatif).
      </Checkbox>
    </div>
  );
}

function AccountFields() {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" required>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </Field>
        <Field label="Nom" name="lastName" required>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </Field>
      </div>
      <Field label="Adresse email" name="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" name="password" required hint="12 caractères minimum, avec au moins une lettre et un chiffre.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
    </>
  );
}

export function RegisterIndividualForm() {
  const [done, setDone] = useState(false);
  if (done) return <Registered />;
  return (
    <ActionForm action={registerIndividual} className="space-y-5" onResult={(s) => s.data?.registered && setDone(true)}>
      <AccountFields />
      <Consents />
      <SubmitButton className="w-full" size="lg" pendingLabel="Création du compte…">
        Créer mon compte gratuit
      </SubmitButton>
    </ActionForm>
  );
}

export function RegisterProfessionalForm() {
  const [done, setDone] = useState(false);
  if (done) return <Registered />;
  return (
    <ActionForm action={registerProfessional} className="space-y-10" onResult={(s) => s.data?.registered && setDone(true)}>
      <Fieldset legend="Votre entreprise" description="Ces informations permettent à notre équipe de vérifier votre activité professionnelle.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom commercial" name="companyName" required>
            <Input id="companyName" name="companyName" autoComplete="organization" required />
          </Field>
          <Field label="Raison sociale" name="legalName">
            <Input id="legalName" name="legalName" />
          </Field>
          <Field label="SIRET / n° d'immatriculation" name="registrationNumber" required>
            <Input id="registrationNumber" name="registrationNumber" required />
          </Field>
          <Field label="N° de TVA intracommunautaire" name="vatNumber">
            <Input id="vatNumber" name="vatNumber" />
          </Field>
          <Field label="Activité principale" name="activity" required>
            <Select id="activity" name="activity" required defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {Object.entries(ACTIVITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Précision (si « Autre »)" name="activityOther">
            <Input id="activityOther" name="activityOther" />
          </Field>
        </div>
        <Field label="Adresse" name="addressLine" required>
          <Input id="addressLine" name="addressLine" autoComplete="street-address" required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Code postal" name="postalCode" required>
            <Input id="postalCode" name="postalCode" autoComplete="postal-code" required />
          </Field>
          <Field label="Ville" name="city" required>
            <Input id="city" name="city" autoComplete="address-level2" required />
          </Field>
          <Field label="Pays" name="country" required>
            <Select id="country" name="country" defaultValue="FR">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Téléphone professionnel" name="phone" required>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
          </Field>
          <Field label="Site internet" name="website">
            <Input id="website" name="website" type="url" placeholder="https://" />
          </Field>
        </div>
        <Field
          label="Justificatif d'immatriculation (Kbis de moins de 3 mois ou équivalent)"
          name="registrationDocument"
          hint="PDF, JPEG ou PNG — 15 Mo max. Facultatif maintenant, mais nécessaire à la validation."
        >
          <Input
            id="registrationDocument"
            name="registrationDocument"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="h-auto py-2.5 file:mr-4 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
          />
        </Field>
      </Fieldset>

      <Fieldset legend="Votre compte" description="Le titulaire du compte est responsable des recherches effectuées.">
        <AccountFields />
      </Fieldset>

      <Consents />
      <SubmitButton className="w-full" size="lg" pendingLabel="Envoi de la demande…">
        Demander mon accès professionnel
      </SubmitButton>
    </ActionForm>
  );
}
