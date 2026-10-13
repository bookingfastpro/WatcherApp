import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireProArea } from "@/server/auth/guards";
import { updateCompanyContact, uploadBusinessDocument } from "@/server/actions/pro";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form-fields";
import { Badge, Card, CardHeader, DefinitionList, Notice, PageHeader } from "@/components/ui/primitives";
import { DocumentList } from "@/components/reports/report-files";
import { ACTIVITY_LABEL, PRO_STATUS_LABEL, PRO_STATUS_TONE } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Profil de l'entreprise" };

export default async function CompanyPage() {
  const { user } = await requireProArea();
  if (!user.professionalProfile) {
    return <Notice>Ce compte n'a pas de profil professionnel.</Notice>;
  }
  const p = await db.professionalProfile.findUniqueOrThrow({
    where: { id: user.professionalProfile.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <>
      <PageHeader eyebrow="Entreprise" title={p.companyName} />
      {p.verificationStatus === "REJECTED" && p.reviewNote ? (
        <Notice tone="alert" title="Motif du refus" className="mb-8">
          {p.reviewNote}
        </Notice>
      ) : null}
      <div className="grid gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Identité légale"
            description="Pour modifier ces informations, contactez l'équipe de la plateforme (nouvelle vérification requise)."
            action={<Badge tone={PRO_STATUS_TONE[p.verificationStatus]}>{PRO_STATUS_LABEL[p.verificationStatus]}</Badge>}
          />
          <div className="px-6 py-2">
            <DefinitionList
              items={[
                { label: "Nom commercial", value: p.companyName },
                { label: "Raison sociale", value: p.legalName },
                { label: "Immatriculation", value: <span className="serial">{p.registrationNumber}</span> },
                { label: "TVA", value: p.vatNumber },
                { label: "Activité", value: p.activity === "OTHER" && p.activityOther ? p.activityOther : ACTIVITY_LABEL[p.activity] },
                { label: "Pays", value: countryName(p.country) },
                { label: "Demande envoyée", value: formatDate(p.submittedAt) },
                { label: "Décision", value: p.reviewedAt ? formatDate(p.reviewedAt) : "En attente" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Coordonnées" />
          <ActionForm action={updateCompanyContact} className="grid gap-5 p-6">
            <Field label="Adresse" name="addressLine" required>
              <Input id="addressLine" name="addressLine" defaultValue={p.addressLine} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Code postal" name="postalCode" required>
                <Input id="postalCode" name="postalCode" defaultValue={p.postalCode} required />
              </Field>
              <Field label="Ville" name="city" required>
                <Input id="city" name="city" defaultValue={p.city} required />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Téléphone" name="phone" required>
                <Input id="phone" name="phone" type="tel" defaultValue={p.phone} required />
              </Field>
              <Field label="Site internet" name="website">
                <Input id="website" name="website" type="url" defaultValue={p.website ?? ""} />
              </Field>
            </div>
            <div>
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Justificatifs transmis" description="Visibles uniquement par vous et l'équipe de vérification." />
          <div className="grid gap-8 p-6">
            <DocumentList documents={p.documents} />
            <ActionForm action={uploadBusinessDocument} className="grid gap-4 sm:max-w-lg" resetOnSuccess>
              <Field label="Ajouter un justificatif (Kbis de moins de 3 mois ou équivalent)" name="document" hint="PDF, JPEG, PNG — 15 Mo max.">
                <Input
                  id="document"
                  name="document"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="h-auto py-2.5 file:mr-3 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
                />
              </Field>
              <div>
                <SubmitButton variant="secondary" pendingLabel="Envoi sécurisé…">
                  Transmettre
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
