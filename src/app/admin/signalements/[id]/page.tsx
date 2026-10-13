import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { updateMatchReport } from "@/server/actions/admin/platform";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/form-fields";
import { Card, CardHeader, DefinitionList, Notice } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { MATCH_CONTEXT_LABEL, MATCH_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "Signalement" };

export default async function AdminMatchDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const m = await db.potentialMatchReport.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      professionalProfile: { select: { id: true, companyName: true, phone: true, city: true } },
      theftReport: {
        select: {
          id: true,
          publicRef: true,
          status: true,
          watch: { select: { brand: true, model: true, serialNumber: true } },
          owner: { select: { email: true, firstName: true, lastName: true, phone: true } },
        },
      },
      handledBy: { select: { email: true } },
    },
  });
  if (!m) notFound();
  const r = m.theftReport;

  return (
    <>
      <Link href="/admin/signalements" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Signalements
      </Link>
      <h1 className="mb-8 font-display text-5xl leading-none text-ink">Signalement de possession</h1>
      <Notice tone="warn" className="mb-8">
        Les coordonnées du propriétaire ne doivent être communiquées au professionnel qu'avec l'accord du propriétaire,
        ou transmises aux autorités dans un cadre légal. Consignez chaque démarche dans les notes.
      </Notice>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader title="Signalement" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Date", value: formatDateTime(m.createdAt) },
                  { label: "Contexte", value: MATCH_CONTEXT_LABEL[m.context] },
                  { label: "N° de série constaté", value: m.observedSerial ? <span className="serial">{m.observedSerial}</span> : null },
                  { label: "Lieu", value: m.location },
                  { label: "Message", value: <span className="whitespace-pre-line">{m.message}</span> },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Professionnel" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  {
                    label: "Entreprise",
                    value: m.professionalProfile ? (
                      <Link href={`/admin/professionnels/${m.professionalProfile.id}`} className="underline">
                        {m.professionalProfile.companyName}
                      </Link>
                    ) : null,
                  },
                  { label: "Contact", value: `${fullName(m.reporter)} — ${m.reporter.email}` },
                  { label: "Téléphone", value: m.professionalProfile?.phone ?? m.reporter.phone },
                  { label: "Ville", value: m.professionalProfile?.city },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Déclaration concernée" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  {
                    label: "Référence",
                    value: (
                      <Link href={`/admin/declarations/${r.id}`} className="serial underline">
                        {r.publicRef}
                      </Link>
                    ),
                  },
                  { label: "Statut", value: <ReportStatusBadge status={r.status} /> },
                  { label: "Montre", value: `${r.watch.brand} ${r.watch.model}` },
                  { label: "N° de série déclaré", value: r.watch.serialNumber ? <span className="serial">{r.watch.serialNumber}</span> : null },
                  { label: "Propriétaire", value: `${fullName(r.owner)} — ${r.owner.email}${r.owner.phone ? ` — ${r.owner.phone}` : ""}` },
                ]}
              />
            </div>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader title="Traitement" description={m.handledAt ? `Dernière action : ${formatDateTime(m.handledAt)} — ${m.handledBy?.email ?? ""}` : undefined} />
          <ActionForm action={updateMatchReport.bind(null, m.id)} className="grid gap-4 p-6">
            <Field label="Statut" name="status">
              <Select id="status" name="status" defaultValue={m.status}>
                {Object.entries(MATCH_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes de traitement" name="adminNotes">
              <Textarea id="adminNotes" name="adminNotes" rows={6} maxLength={5000} defaultValue={m.adminNotes ?? ""} />
            </Field>
            <div>
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
