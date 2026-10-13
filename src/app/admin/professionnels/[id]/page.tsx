import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/guards";
import { decideProfessional, grantManualSubscription, revokeManualSubscription } from "@/server/actions/admin/professionals";
import { moderateDocument } from "@/server/actions/admin/reports";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { Badge, Card, CardHeader, DefinitionList, DemoBadge, Notice, Table } from "@/components/ui/primitives";
import { DocumentModerationButtons } from "@/components/admin/moderation";
import { ACTIVITY_LABEL, DOCUMENT_KIND_LABEL, MODERATION_LABEL, PRO_STATUS_LABEL, PRO_STATUS_TONE, SUBSCRIPTION_STATUS_LABEL } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatBytes, formatDate, formatDateTime, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "Professionnel" };

export default async function AdminProDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const p = await db.professionalProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, status: true, emailVerifiedAt: true, isDemo: true } },
      documents: { orderBy: { createdAt: "desc" } },
      subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: { select: { name: true } } } },
      reviewedBy: { select: { email: true } },
    },
  });
  if (!p) notFound();
  await audit({ category: "ACCESS", action: "admin.professional_viewed", actor: { id: admin.id, role: admin.role }, targetType: "ProfessionalProfile", targetId: p.id });

  const month = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [searches30d, flagged30d, plans] = await Promise.all([
    db.professionalSearch.count({ where: { professionalProfileId: p.id, createdAt: { gte: month } } }),
    db.professionalSearch.count({ where: { professionalProfileId: p.id, createdAt: { gte: month }, flagged: true } }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const defaultEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <>
      <Link href="/admin/professionnels" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Professionnels
      </Link>
      <header className="mb-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone={PRO_STATUS_TONE[p.verificationStatus]}>{PRO_STATUS_LABEL[p.verificationStatus]}</Badge>
          {p.user.isDemo ? <DemoBadge /> : null}
        </div>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink">{p.companyName}</h1>
        <p className="mt-2 text-slate">
          <Link href={`/admin/utilisateurs/${p.user.id}`} className="underline">
            {fullName(p.user)}
          </Link>{" "}
          · {p.user.email} {p.user.emailVerifiedAt ? "" : "(email non vérifié)"}
        </p>
      </header>

      {flagged30d > 0 ? (
        <Notice tone="alert" title="Comportement de recherche anormal" className="mb-8">
          {flagged30d} recherche(s) marquée(s) comme anormale(s) sur 30 jours.{" "}
          <Link href={`/admin/recherches?anomalies=1&q=${encodeURIComponent(p.user.email)}`} className="underline">
            Voir le détail
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader title="Entreprise" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Raison sociale", value: p.legalName },
                  { label: "Immatriculation", value: <span className="serial">{p.registrationNumber}</span> },
                  { label: "TVA", value: p.vatNumber },
                  { label: "Activité", value: `${ACTIVITY_LABEL[p.activity]}${p.activityOther ? ` — ${p.activityOther}` : ""}` },
                  { label: "Adresse", value: `${p.addressLine}, ${p.postalCode} ${p.city}, ${countryName(p.country)}` },
                  { label: "Téléphone", value: p.phone },
                  { label: "Site", value: p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="underline">{p.website}</a> : null },
                  { label: "Demande", value: formatDateTime(p.submittedAt) },
                  { label: "Dernière décision", value: p.reviewedAt ? `${formatDateTime(p.reviewedAt)} — ${p.reviewedBy?.email ?? "—"}` : "—" },
                  { label: "Recherches (30 j)", value: searches30d },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Justificatifs" description="Vérifiez notamment le Kbis (moins de 3 mois) et la cohérence avec le SIRET déclaré." />
            <div className="p-6">
              {p.documents.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {p.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-4 py-3">
                      <FileText className="size-5 shrink-0 text-smoke" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <a href={`/api/files/document/${d.id}`} target="_blank" rel="noopener" className="block truncate text-sm hover:underline">
                          {d.originalName}
                        </a>
                        <p className="text-xs text-smoke">
                          {DOCUMENT_KIND_LABEL[d.kind]} · {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt)} · {MODERATION_LABEL[d.moderationStatus]}
                        </p>
                      </div>
                      <DocumentModerationButtons action={moderateDocument} documentId={d.id} status={d.moderationStatus} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Notice tone="warn">Aucun justificatif transmis.</Notice>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Abonnements" />
            {p.subscriptions.length ? (
              <Table className="border-0">
                <thead>
                  <tr>
                    <th>Offre</th>
                    <th>Source</th>
                    <th>Statut</th>
                    <th>Échéance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.plan?.name ?? "—"}{s.note ? <span className="block text-xs text-smoke">{s.note}</span> : null}</td>
                      <td>{s.source === "STRIPE" ? "Stripe" : "Manuel"}</td>
                      <td>{SUBSCRIPTION_STATUS_LABEL[s.status]}{s.cancelAtPeriodEnd ? " (résiliation programmée)" : ""}</td>
                      <td>{formatDate(s.currentPeriodEnd)}</td>
                      <td className="text-right">
                        {s.source === "MANUAL" && s.status === "ACTIVE" ? (
                          <ActionForm action={revokeManualSubscription.bind(null, s.id)} showInlineError={false} confirm={{ title: "Révoquer cet accès manuel ?", tone: "danger", confirmLabel: "Révoquer" }}>
                            <SubmitButton variant="ghost" size="sm">
                              Révoquer
                            </SubmitButton>
                          </ActionForm>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="px-6 py-5 text-sm text-smoke">Aucun abonnement.</p>
            )}
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader title="Décision" />
            <ActionForm action={decideProfessional.bind(null, p.id)} className="grid gap-4 p-6">
              <Field label="Statut de validation" name="decision">
                <Select id="decision" name="decision" defaultValue={p.verificationStatus}>
                  {Object.entries(PRO_STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Motif / commentaire" name="note" hint="Obligatoire pour un refus ou une suspension. Communiqué au professionnel en cas de refus.">
                <Textarea id="note" name="note" rows={3} maxLength={2000} defaultValue={p.reviewNote ?? ""} />
              </Field>
              <div>
                <SubmitButton>Enregistrer la décision</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card>
            <CardHeader title="Accorder un accès manuel" description="Partenaire, période d'essai, geste commercial — sans paiement." />
            <ActionForm action={grantManualSubscription.bind(null, p.id)} className="grid gap-4 p-6">
              <Field label="Offre de rattachement" name="planId">
                <Select id="planId" name="planId" defaultValue="">
                  <option value="">Aucune</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fin de l'accès" name="endsAt" required>
                <Input id="endsAt" name="endsAt" type="date" defaultValue={defaultEnd} required />
              </Field>
              <Field label="Note" name="note">
                <Input id="note" name="note" maxLength={500} />
              </Field>
              <div>
                <SubmitButton variant="secondary">Accorder l'accès</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
