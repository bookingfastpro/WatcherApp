import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireProAccess } from "@/server/auth/guards";
import { SAFE_REPORT_SELECT, proCanViewReport, toSafeMatch } from "@/server/search";
import { getSettings } from "@/server/settings";
import { submitMatchReport, toggleBookmark } from "@/server/actions/pro";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { Card, CardHeader, DefinitionList, DemoBadge } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { WatchImage } from "@/components/watch/watch-image";
import { MatchAlert, alertKindFor } from "@/components/pro/match-alert";
import { isValidPublicRef } from "@/lib/public-ref";
import { MATCH_CONTEXT_LABEL } from "@/lib/labels";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Fiche déclaration", robots: { index: false } };

export default async function ProReportPage({ params }: { params: Promise<{ ref: string }> }) {
  const { user } = await requireProAccess();
  const { ref } = await params;
  if (!isValidPublicRef(ref)) notFound();

  const row = await db.theftReport.findUnique({ where: { publicRef: ref }, select: SAFE_REPORT_SELECT });
  // Accès uniquement après une recherche correspondante récente ou un suivi : pas d'énumération.
  if (!row || row.status === "REJECTED" || !(await proCanViewReport(user, row.id))) notFound();

  const settings = await getSettings();
  const report = toSafeMatch(row, true);
  const [bookmark, lastSearch] = await Promise.all([
    db.bookmark.findUnique({ where: { userId_theftReportId: { userId: user.id, theftReportId: row.id } } }),
    db.professionalSearch.findFirst({
      where: { userId: user.id, matchedReportIds: { has: row.id } },
      orderBy: { createdAt: "desc" },
      select: { type: true, serialNormalized: true },
    }),
  ]);
  // Numéro complet seulement si le pro l'a lui-même saisi, ou si la politique l'autorise.
  const revealSerial = settings.serialDisplayPolicy === "FULL" || Boolean(lastSearch?.serialNormalized);
  const display = revealSerial ? report : toSafeMatch(row, false);

  await audit({
    category: "ACCESS",
    action: "pro.report_viewed",
    actor: { id: user.id, role: user.role },
    targetType: "TheftReport",
    targetId: row.id,
  });

  const bound = {
    bookmark: toggleBookmark.bind(null, ref),
    match: submitMatchReport.bind(null, ref),
  };

  return (
    <>
      <Link href="/pro" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Nouvelle vérification
      </Link>

      <MatchAlert kind={alertKindFor([report.status])} className="mb-10" />

      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ReportStatusBadge status={report.status} />
            {report.isDemo ? <DemoBadge /> : null}
          </div>
          <p className="eyebrow mt-5">{report.brand}</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-ink">{report.model}</h1>
          <p className="serial mt-3 text-sm text-slate">Identifiant de déclaration : {report.publicRef}</p>
        </div>
        <ActionForm action={bound.bookmark} showInlineError={false}>
          <SubmitButton variant="secondary">
            {bookmark ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
            {bookmark ? "Suivi" : "Suivre ce dossier"}
          </SubmitButton>
        </ActionForm>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          {display.imageIds.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {display.imageIds.map((id, i) => (
                <WatchImage
                  key={id}
                  imageId={id}
                  alt={`${report.brand} ${report.model} — photo ${i + 1}`}
                  className={i === 0 ? "col-span-2 row-span-2 aspect-square w-full border border-line" : "aspect-square w-full border border-line"}
                />
              ))}
            </div>
          ) : null}
          <Card>
            <CardHeader title="Caractéristiques déclarées" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Marque", value: display.brand },
                  { label: "Modèle", value: display.model },
                  { label: "Référence", value: display.reference ? <span className="serial">{display.reference}</span> : null },
                  {
                    label: "Numéro de série",
                    value: display.serial ? (
                      <span className="serial">
                        {display.serial}
                        {display.serialMasked ? <span className="ml-2 font-sans text-xs text-smoke">(masqué)</span> : null}
                      </span>
                    ) : null,
                  },
                  { label: "Année", value: display.yearApprox },
                  { label: "Boîtier", value: [display.caseMaterial, display.caseSizeMm ? `${display.caseSizeMm} mm` : null].filter(Boolean).join(" · ") || null },
                  { label: "Cadran", value: display.dialColor },
                  { label: "Bracelet", value: display.strap },
                  { label: "Signes distinctifs", value: display.distinctiveMarks },
                  { label: "Signalement", value: formatMonth(display.reportedAt) },
                ]}
              />
            </div>
          </Card>
          <p className="text-xs leading-relaxed text-smoke">
            Informations déclarées par le propriétaire{report.verified ? " et vérifiées par notre équipe" : ", en cours de vérification"}.
            Les données personnelles du propriétaire, la plainte et les justificatifs ne sont jamais communiqués.
          </p>
        </div>

        <Card className="h-fit xl:sticky xl:top-8">
          <CardHeader
            title="Signaler une possession potentielle"
            description="Une montre correspondant à cette déclaration vous est proposée ou se trouve en votre possession ?"
          />
          <ActionForm action={bound.match} className="grid gap-5 p-6" resetOnSuccess>
            <Field label="Contexte" name="context" required>
              <Select id="context" name="context" required defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {Object.entries(MATCH_CONTEXT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="N° de série constaté" name="observedSerial">
                <Input id="observedSerial" name="observedSerial" className="serial" maxLength={64} />
              </Field>
              <Field label="Ville" name="location">
                <Input id="location" name="location" maxLength={120} />
              </Field>
            </div>
            <Field label="Description de la situation" name="message" required>
              <Textarea id="message" name="message" rows={5} maxLength={4000} required />
            </Field>
            <Checkbox name="confirm" required>
              Je confirme l'exactitude de ce signalement. Il est transmis à l'équipe de la plateforme, qui pourra me recontacter.
            </Checkbox>
            <SubmitButton variant="danger" pendingLabel="Transmission…">
              Transmettre le signalement
            </SubmitButton>
            <p className="text-xs leading-relaxed text-smoke">
              Pour votre sécurité, n'entreprenez aucune démarche de confrontation. Les coordonnées du propriétaire ne vous
              seront pas communiquées ; notre équipe coordonne la suite avec lui et, le cas échéant, les autorités.
            </p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
