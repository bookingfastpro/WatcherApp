import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/guards";
import { moderateDocument, moderateImage, saveAdminNotes, sendAdminMessage, setReportStatus } from "@/server/actions/admin/reports";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form-fields";
import { Badge, Card, CardHeader, DefinitionList, DemoBadge, Notice } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { WatchImage } from "@/components/watch/watch-image";
import { MessageThread } from "@/components/reports/message-thread";
import { DocumentModerationButtons, ImageModerationButtons } from "@/components/admin/moderation";
import { DOCUMENT_KIND_LABEL, MATCH_STATUS_LABEL, MODERATION_LABEL, REPORT_STATUS_LABEL } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatBytes, formatDate, formatDateTime, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "Déclaration" };

export default async function AdminReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const report = await db.theftReport.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true } },
      watch: { include: { images: { orderBy: { position: "asc" } } } },
      documents: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      matchReports: { orderBy: { createdAt: "desc" }, include: { professionalProfile: { select: { companyName: true } } } },
      verifiedBy: { select: { email: true } },
    },
  });
  if (!report) notFound();

  await audit({ category: "ACCESS", action: "admin.report_viewed", actor: { id: admin.id, role: admin.role }, targetType: "TheftReport", targetId: report.id });

  const w = report.watch;
  // Autres déclarations portant le même numéro de série (doublon ou fraude potentielle).
  const duplicates = w.serialNormalized
    ? await db.theftReport.findMany({
        where: { id: { not: report.id }, watch: { serialNormalized: w.serialNormalized } },
        select: { id: true, publicRef: true, status: true, owner: { select: { email: true } } },
      })
    : [];

  const bound = {
    status: setReportStatus.bind(null, report.id),
    message: sendAdminMessage.bind(null, report.id),
    notes: saveAdminNotes.bind(null, report.id),
    image: moderateImage.bind(null, report.id),
  };

  return (
    <>
      <Link href="/admin/declarations" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Déclarations
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ReportStatusBadge status={report.status} />
            {report.isDemo ? <DemoBadge /> : null}
            <span className="serial text-sm text-slate">{report.publicRef}</span>
          </div>
          <h1 className="mt-4 font-display text-5xl leading-none text-ink">
            {w.brand} {w.model}
          </h1>
          <p className="mt-3 text-sm text-slate">
            Déclarée le {formatDateTime(report.createdAt)} · certifiée sur l'honneur le {formatDateTime(report.ownerCertifiedAt)}
            {report.verifiedAt ? ` · vérifiée le ${formatDate(report.verifiedAt)} par ${report.verifiedBy?.email ?? "—"}` : ""}
          </p>
        </div>
      </header>

      {duplicates.length ? (
        <Notice tone="alert" title="Numéro de série présent dans d'autres déclarations" className="mb-8">
          <ul className="mt-1 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/declarations/${d.id}`} className="serial underline">
                  {d.publicRef}
                </Link>{" "}
                — {REPORT_STATUS_LABEL[d.status]} — {d.owner.email}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader title="Identification (visible des professionnels)" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Référence", value: w.reference ? <span className="serial">{w.reference}</span> : null },
                  { label: "Numéro de série", value: w.serialNumber ? <span className="serial">{w.serialNumber}</span> : <Badge tone="warn">Non renseigné</Badge> },
                  { label: "Année", value: w.yearApprox },
                  { label: "Boîtier", value: [w.caseMaterial, w.caseSizeMm ? `${w.caseSizeMm} mm` : null].filter(Boolean).join(" · ") || null },
                  { label: "Cadran", value: w.dialColor },
                  { label: "Bracelet", value: w.strap },
                  { label: "Signes distinctifs", value: w.distinctiveMarks },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Photos" description="Les photos rejetées ou masquées ne sont jamais servies aux professionnels." />
            <div className="p-6">
              {w.images.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {w.images.map((img) => (
                    <figure key={img.id} className="border border-line">
                      <a href={`/api/files/image/${img.id}`} target="_blank" rel="noopener">
                        <WatchImage imageId={img.id} alt="" className="aspect-square w-full" />
                      </a>
                      <figcaption className="flex items-center justify-between gap-2 p-2">
                        <span className="text-[11px] text-smoke">
                          {MODERATION_LABEL[img.moderationStatus]}
                          {!img.visibleToProfessionals ? " · masquée" : ""}
                        </span>
                        <ImageModerationButtons action={bound.image} imageId={img.id} visible={img.visibleToProfessionals} status={img.moderationStatus} />
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-smoke">Aucune photo.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Informations confidentielles" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Déclarant", value: <Link href={`/admin/utilisateurs/${report.owner.id}`} className="underline">{fullName(report.owner)}</Link> },
                  { label: "Email", value: report.owner.email },
                  { label: "Téléphone", value: report.owner.phone },
                  { label: "Date du vol", value: formatDate(report.theftDate) },
                  { label: "Lieu", value: `${report.theftCity}, ${countryName(report.theftCountry)}` },
                  { label: "Circonstances", value: report.circumstances ? <span className="whitespace-pre-line">{report.circumstances}</span> : null },
                  { label: "Description", value: report.privateDescription ? <span className="whitespace-pre-line">{report.privateDescription}</span> : null },
                  { label: "Plainte", value: report.policeReportFiled ? <span className="serial">{report.policeReportNumber}</span> : <Badge tone="warn">Non déposée</Badge> },
                  { label: "Service", value: report.policeService },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Justificatifs" description="Chaque consultation est journalisée." />
            <div className="p-6">
              {report.documents.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {report.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-4 py-3">
                      <FileText className="size-5 shrink-0 text-smoke" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <a href={`/api/files/document/${d.id}`} target="_blank" rel="noopener" className="block truncate text-sm text-ink hover:underline">
                          {d.originalName}
                        </a>
                        <p className="text-xs text-smoke">
                          {DOCUMENT_KIND_LABEL[d.kind]} · {formatBytes(d.sizeBytes)} · {MODERATION_LABEL[d.moderationStatus]} · SHA-256 {d.sha256.slice(0, 12)}…
                        </p>
                      </div>
                      <DocumentModerationButtons action={moderateDocument} documentId={d.id} status={d.moderationStatus} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-smoke">Aucun justificatif transmis.</p>
              )}
            </div>
          </Card>

          {report.matchReports.length ? (
            <Card>
              <CardHeader title="Signalements de possession" />
              <ul className="divide-y divide-line">
                {report.matchReports.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="size-4 text-alert" aria-hidden />
                      <Link href={`/admin/signalements/${m.id}`} className="text-sm underline">
                        {m.professionalProfile?.companyName ?? "Professionnel"} — {formatDate(m.createdAt)}
                      </Link>
                    </div>
                    <Badge>{MATCH_STATUS_LABEL[m.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader title="Statut" />
            <ActionForm action={bound.status} className="grid gap-4 p-6">
              <Field label="Nouveau statut" name="status">
                <Select id="status" name="status" defaultValue={report.status}>
                  {Object.entries(REPORT_STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Motif / informations demandées" name="reason" hint="Obligatoire pour « Refusée » et « Informations demandées ». Visible par le déclarant.">
                <Textarea id="reason" name="reason" rows={3} maxLength={2000} />
              </Field>
              <Checkbox name="notifyOwner" defaultChecked>
                Informer le déclarant par email
              </Checkbox>
              <div>
                <SubmitButton>Mettre à jour</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card>
            <CardHeader title="Échanges avec le déclarant" />
            <div className="max-h-[460px] overflow-y-auto p-6">
              <MessageThread messages={report.messages} viewer="admin" />
            </div>
            <div className="border-t border-line p-6">
              <ActionForm action={bound.message} className="grid gap-3" resetOnSuccess>
                <Field label="Message au déclarant" name="body">
                  <Textarea id="body" name="body" rows={3} maxLength={4000} />
                </Field>
                <div>
                  <SubmitButton variant="secondary">Envoyer</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notes internes" description="Jamais visibles du déclarant ni des professionnels." />
            <ActionForm action={bound.notes} className="grid gap-3 p-6">
              <Textarea name="adminNotes" aria-label="Notes internes" rows={5} maxLength={5000} defaultValue={report.adminNotes ?? ""} />
              <div>
                <SubmitButton variant="secondary">Enregistrer</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
