import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Lock, Pencil } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { addReportFiles, deleteReportFile, markRecovered, sendOwnerMessage } from "@/server/actions/reports";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Textarea, Field } from "@/components/ui/form-fields";
import { Card, CardHeader, DefinitionList, DemoBadge, Notice } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { WatchImage } from "@/components/watch/watch-image";
import { AddFilesForm, DeleteFileButton, DocumentList } from "@/components/reports/report-files";
import { MessageThread } from "@/components/reports/message-thread";
import { countryName } from "@/lib/countries";
import { formatDate, formatMonth } from "@/lib/format";
import { ownerCanAddFiles, ownerCanDeleteFiles, ownerCanEditReport, ownerCanMarkRecovered } from "@/lib/permissions";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Ma déclaration" };

const STATUS_HELP: Record<string, string> = {
  PENDING: "Votre déclaration est en cours d'examen par notre équipe. Selon la politique de la plateforme, elle peut déjà apparaître aux professionnels avec la mention « en cours de vérification ».",
  VERIFIED: "Votre déclaration a été vérifiée. Les professionnels abonnés qui contrôlent cette montre verront une alerte « Montre signalée volée ».",
  INFO_REQUESTED: "Notre équipe a besoin d'informations ou de documents complémentaires. Consultez la demande ci-dessous et répondez via la messagerie.",
  REJECTED: "Votre déclaration n'a pas pu être validée. Consultez le motif dans la messagerie ; vous pouvez nous répondre si nécessaire.",
  RECOVERED: "Cette montre a été déclarée retrouvée. Elle reste visible des professionnels en recherche exacte, avec cette mention.",
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const report = await db.theftReport.findFirst({
    where: { id, ownerId: user.id },
    include: {
      watch: { include: { images: { orderBy: { position: "asc" } } } },
      documents: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) notFound();

  // Marque les messages de l'équipe comme lus.
  await db.reportMessage.updateMany({
    where: { theftReportId: report.id, fromAdmin: true, readAt: null },
    data: { readAt: new Date() },
  });

  const w = report.watch;
  const canDelete = ownerCanDeleteFiles(report.status);
  const bound = {
    add: addReportFiles.bind(null, report.id),
    del: deleteReportFile.bind(null, report.id),
    recovered: markRecovered.bind(null, report.id),
    message: sendOwnerMessage.bind(null, report.id),
  };

  return (
    <>
      <Link href="/espace" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Mes déclarations
      </Link>

      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ReportStatusBadge status={report.status} />
            {report.isDemo ? <DemoBadge /> : null}
            <span className="serial text-xs text-smoke">{report.publicRef}</span>
          </div>
          <p className="eyebrow mt-5">{w.brand}</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-ink">{w.model}</h1>
          <p className="mt-3 text-sm text-slate">Déclarée le {formatDate(report.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {ownerCanEditReport(report.status) ? (
            <ButtonLink href={`/espace/declarations/${report.id}/modifier`} variant="secondary">
              <Pencil className="size-4" aria-hidden /> Modifier
            </ButtonLink>
          ) : null}
          {ownerCanMarkRecovered(report.status) ? (
            <ActionForm
              action={bound.recovered}
              showInlineError={false}
              confirm={{
                title: "Avez-vous retrouvé votre montre ?",
                description: "La déclaration passera au statut « Montre retrouvée ». Les professionnels ne verront plus d'alerte de vol.",
                confirmLabel: "Oui, je l'ai retrouvée",
              }}
            >
              <SubmitButton variant="primary">Montre retrouvée</SubmitButton>
            </ActionForm>
          ) : null}
        </div>
      </header>

      {param(sp.nouvelle) ? (
        <Notice tone="ok" title="Déclaration enregistrée" className="mb-8">
          Merci. Notre équipe va examiner votre déclaration ; vous serez informé par email de chaque évolution.
        </Notice>
      ) : null}
      {param(sp.modifiee) ? <Notice tone="ok" className="mb-8">Vos modifications ont été enregistrées.</Notice> : null}
      <Notice tone={report.status === "INFO_REQUESTED" ? "warn" : report.status === "REJECTED" ? "alert" : "neutral"} className="mb-10">
        {STATUS_HELP[report.status]}
        {report.statusReason ? <span className="mt-2 block font-medium text-ink">Motif : {report.statusReason}</span> : null}
      </Notice>

      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader
              title="Identification"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs text-ok">
                  <Eye className="size-3.5" aria-hidden /> Visible des professionnels vérifiés
                </span>
              }
            />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Marque", value: w.brand },
                  { label: "Modèle", value: w.model },
                  { label: "Référence", value: w.reference ? <span className="serial">{w.reference}</span> : null },
                  { label: "Numéro de série", value: w.serialNumber ? <span className="serial">{w.serialNumber}</span> : null },
                  { label: "Année", value: w.yearApprox },
                  { label: "Boîtier", value: [w.caseMaterial, w.caseSizeMm ? `${w.caseSizeMm} mm` : null].filter(Boolean).join(" · ") || null },
                  { label: "Cadran", value: w.dialColor },
                  { label: "Bracelet", value: w.strap },
                  { label: "Signes distinctifs", value: w.distinctiveMarks },
                  { label: "Mois du signalement", value: formatMonth(report.createdAt) },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Photos" description={`${w.images.length} photo(s)`} />
            <div className="p-6">
              {w.images.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {w.images.map((img) => (
                    <figure key={img.id} className="group relative">
                      <WatchImage imageId={img.id} alt={`${w.brand} ${w.model}`} className="aspect-square w-full border border-line" />
                      {canDelete ? (
                        <div className="absolute right-1 top-1 bg-paper/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                          <DeleteFileButton action={bound.del} fileId={img.id} fileType="image" />
                        </div>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-smoke">Aucune photo. Des photos facilitent grandement l'identification.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Informations confidentielles"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                  <Lock className="size-3.5" aria-hidden /> Équipe de vérification uniquement
                </span>
              }
            />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Date du vol", value: formatDate(report.theftDate) },
                  { label: "Lieu", value: `${report.theftCity}, ${countryName(report.theftCountry)}` },
                  { label: "Circonstances", value: report.circumstances },
                  { label: "Description", value: report.privateDescription },
                  { label: "Dépôt de plainte", value: report.policeReportFiled ? `Oui — ${report.policeReportNumber}` : "Non renseigné" },
                  { label: "Service", value: report.policeService },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Justificatifs" description="Documents privés, jamais accessibles aux professionnels." />
            <div className="space-y-8 p-6">
              <DocumentList documents={report.documents} deleteAction={canDelete ? bound.del : undefined} />
              {ownerCanAddFiles(report.status) ? <AddFilesForm action={bound.add} /> : null}
            </div>
          </Card>
        </div>

        <div>
          <Card className="xl:sticky xl:top-8">
            <CardHeader title="Échanges avec l'équipe" description="Demandes de documents, questions, suivi." />
            <div className="max-h-[520px] overflow-y-auto p-6">
              <MessageThread messages={report.messages} viewer="owner" />
            </div>
            <div className="border-t border-line p-6">
              <ActionForm action={bound.message} resetOnSuccess className="space-y-3">
                <Field label="Votre message" name="body">
                  <Textarea id="body" name="body" rows={4} maxLength={4000} required />
                </Field>
                <SubmitButton pendingLabel="Envoi…">Envoyer</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
