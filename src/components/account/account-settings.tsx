import { Download } from "lucide-react";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/session";
import { changePassword, requestAccountDeletion, updateProfile } from "@/server/actions/account";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-fields";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, Notice } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

/** Paramètres du compte + droits RGPD (partagé entre espace propriétaire et espace pro). */
export async function AccountSettings({ user }: { user: SessionUser }) {
  const [full, deletion] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { firstName: true, lastName: true, phone: true, email: true, marketingConsent: true, createdAt: true, termsAcceptedAt: true },
    }),
    db.dataRequest.findFirst({ where: { userId: user.id, type: "DELETION", status: "PENDING" } }),
  ]);

  return (
    <div className="grid max-w-3xl gap-8">
      <Card>
        <CardHeader title="Profil" description={`Compte créé le ${formatDate(full.createdAt)} · ${full.email}`} />
        <ActionForm action={updateProfile} className="grid gap-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prénom" name="firstName" required>
              <Input id="firstName" name="firstName" defaultValue={full.firstName ?? ""} required />
            </Field>
            <Field label="Nom" name="lastName" required>
              <Input id="lastName" name="lastName" defaultValue={full.lastName ?? ""} required />
            </Field>
          </div>
          <Field label="Téléphone" name="phone" hint="Facultatif — utilisé uniquement par l'équipe de vérification.">
            <Input id="phone" name="phone" type="tel" defaultValue={full.phone ?? ""} />
          </Field>
          <Checkbox name="marketingConsent" defaultChecked={full.marketingConsent}>
            Recevoir des informations sur les évolutions du service
          </Checkbox>
          <div>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title="Mot de passe" description="La modification déconnecte vos autres appareils." />
        <ActionForm action={changePassword} className="grid gap-5 p-6" resetOnSuccess>
          <Field label="Mot de passe actuel" name="currentPassword" required>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nouveau mot de passe" name="password" required hint="12 caractères minimum.">
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label="Confirmation" name="confirm" required>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </div>
          <div>
            <SubmitButton>Modifier le mot de passe</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title="Vos données personnelles" description="Droits d'accès, de portabilité et d'effacement (RGPD)." />
        <div className="grid gap-8 p-6">
          <div>
            <p className="text-sm leading-relaxed text-graphite">
              Téléchargez l'ensemble des données associées à votre compte (profil, déclarations, messages) au format JSON.
            </p>
            <a href="/api/account/export" className={buttonClasses("secondary", "md", "mt-4")}>
              <Download className="size-4" aria-hidden /> Exporter mes données
            </a>
          </div>
          <div className="border-t border-line pt-8">
            <p className="text-sm font-medium text-ink">Supprimer mon compte</p>
            {deletion ? (
              <Notice tone="warn" className="mt-3">
                Demande envoyée le {formatDate(deletion.createdAt)} — en cours de traitement.
              </Notice>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  Votre demande est examinée par notre équipe : certaines données liées à une déclaration vérifiée peuvent
                  devoir être conservées pour une durée limitée (obligations légales, intérêt des victimes). Vous serez informé de la suite donnée.
                </p>
                <ActionForm
                  action={requestAccountDeletion}
                  className="mt-4 grid gap-4"
                  confirm={{
                    title: "Demander la suppression du compte ?",
                    description: "Vos données personnelles seront supprimées ou anonymisées après examen de la demande.",
                    confirmLabel: "Envoyer la demande",
                    tone: "danger",
                  }}
                >
                  <Field label="Précision (facultatif)" name="note">
                    <Textarea id="note" name="note" rows={3} maxLength={1000} />
                  </Field>
                  <div>
                    <SubmitButton variant="danger">Demander la suppression</SubmitButton>
                  </div>
                </ActionForm>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
