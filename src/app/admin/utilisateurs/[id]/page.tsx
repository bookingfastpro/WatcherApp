import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/guards";
import {
  adminResendVerification,
  processDeletion,
  reactivateUser,
  revokeUserSessions,
  suspendUser,
} from "@/server/actions/admin/users";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form-fields";
import { Badge, Card, CardHeader, DefinitionList, DemoBadge, Notice, Table } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { AUDIT_CATEGORY_LABEL, ROLE_LABEL, USER_STATUS_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime, fullName } from "@/lib/format";

export const metadata: Metadata = { title: "Utilisateur" };

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      professionalProfile: { select: { id: true, companyName: true, verificationStatus: true } },
      theftReports: { select: { id: true, publicRef: true, status: true, createdAt: true, watch: { select: { brand: true, model: true } } }, orderBy: { createdAt: "desc" } },
      dataRequests: { orderBy: { createdAt: "desc" } },
      _count: { select: { sessions: true, searches: true } },
    },
  });
  if (!user) notFound();
  await audit({ category: "ACCESS", action: "admin.user_viewed", actor: { id: admin.id, role: admin.role }, targetType: "User", targetId: user.id });

  const [securityEvents] = await Promise.all([
    db.auditLog.findMany({
      where: { OR: [{ actorId: user.id }, { targetType: "User", targetId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);
  const self = user.id === admin.id;
  const pendingDeletion = user.dataRequests.find((r) => r.type === "DELETION" && r.status === "PENDING");

  return (
    <>
      <Link href="/admin/utilisateurs" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Utilisateurs
      </Link>
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ROLE_LABEL[user.role]}</Badge>
          <Badge tone={user.status === "ACTIVE" ? "ok" : "alert"}>{USER_STATUS_LABEL[user.status]}</Badge>
          {user.isDemo ? <DemoBadge /> : null}
        </div>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink">{fullName(user)}</h1>
        <p className="mt-2 text-slate">{user.email}</p>
      </header>

      {pendingDeletion ? (
        <Notice tone="warn" title="Demande de suppression en attente" className="mb-8">
          Reçue le {formatDate(pendingDeletion.createdAt)}. {pendingDeletion.note ? `« ${pendingDeletion.note} »` : ""}
        </Notice>
      ) : null}
      {user.suspendedReason && user.status === "SUSPENDED" ? (
        <Notice tone="alert" title="Motif de suspension" className="mb-8">
          {user.suspendedReason}
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card>
            <CardHeader title="Compte" />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "Email vérifié", value: user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : <Badge tone="warn">Non</Badge> },
                  { label: "Téléphone", value: user.phone },
                  { label: "Inscription", value: formatDateTime(user.createdAt) },
                  { label: "Dernière connexion", value: formatDateTime(user.lastLoginAt) },
                  { label: "Sessions actives", value: user._count.sessions },
                  { label: "CGU acceptées", value: formatDateTime(user.termsAcceptedAt) },
                  { label: "Consentement marketing", value: user.marketingConsent ? "Oui" : "Non" },
                  ...(user.professionalProfile
                    ? [
                        {
                          label: "Entreprise",
                          value: (
                            <Link href={`/admin/professionnels/${user.professionalProfile.id}`} className="underline">
                              {user.professionalProfile.companyName}
                            </Link>
                          ),
                        },
                        { label: "Recherches", value: user._count.searches },
                      ]
                    : []),
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Déclarations" />
            {user.theftReports.length ? (
              <ul className="divide-y divide-line">
                {user.theftReports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-6 py-3">
                    <Link href={`/admin/declarations/${r.id}`} className="text-sm hover:underline">
                      <span className="serial mr-2">{r.publicRef}</span> {r.watch.brand} {r.watch.model}
                    </Link>
                    <ReportStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-5 text-sm text-smoke">Aucune déclaration.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Événements récents" />
            <Table className="border-0">
              <tbody>
                {securityEvents.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-slate">{formatDateTime(e.createdAt)}</td>
                    <td>
                      <Badge tone={e.category === "SECURITY" ? "alert" : "neutral"}>{AUDIT_CATEGORY_LABEL[e.category]}</Badge>
                    </td>
                    <td className="serial text-[13px]">{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div className="space-y-8">
          {self ? (
            <Notice>Il s'agit de votre propre compte : les actions de modération sont désactivées.</Notice>
          ) : user.status === "DELETED" ? (
            <Notice>Ce compte a été anonymisé.</Notice>
          ) : (
            <>
              <Card>
                <CardHeader title="Sécurité" />
                <div className="grid gap-3 p-6">
                  <ActionForm action={revokeUserSessions.bind(null, user.id)} confirm={{ title: "Révoquer toutes les sessions ?", description: "L'utilisateur sera déconnecté de tous ses appareils." }}>
                    <SubmitButton variant="secondary" className="w-full">
                      Déconnecter tous les appareils
                    </SubmitButton>
                  </ActionForm>
                  {!user.emailVerifiedAt ? (
                    <ActionForm action={adminResendVerification.bind(null, user.id)}>
                      <SubmitButton variant="secondary" className="w-full">
                        Renvoyer l'email de vérification
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
              </Card>

              <Card>
                <CardHeader title={user.status === "SUSPENDED" ? "Réactiver le compte" : "Suspendre le compte"} />
                {user.status === "SUSPENDED" ? (
                  <ActionForm action={reactivateUser.bind(null, user.id)} className="p-6">
                    <SubmitButton>Réactiver</SubmitButton>
                  </ActionForm>
                ) : (
                  <ActionForm
                    action={suspendUser.bind(null, user.id)}
                    className="grid gap-4 p-6"
                    confirm={{ title: "Suspendre ce compte ?", description: "Toutes ses sessions seront révoquées et il ne pourra plus se connecter.", tone: "danger", confirmLabel: "Suspendre" }}
                  >
                    <Field label="Motif (conservé dans le journal d'audit)" name="reason" required>
                      <Textarea id="reason" name="reason" rows={3} maxLength={1000} />
                    </Field>
                    <div>
                      <SubmitButton variant="danger">Suspendre</SubmitButton>
                    </div>
                  </ActionForm>
                )}
              </Card>

              {user.role !== "ADMIN" ? (
                <Card>
                  <CardHeader title="Effacement (RGPD)" description="Anonymise le compte et supprime les documents privés. Irréversible." />
                  <ActionForm
                    action={processDeletion.bind(null, user.id)}
                    className="grid gap-4 p-6"
                    confirm={{
                      title: "Anonymiser définitivement ce compte ?",
                      description: "Les documents privés et les déclarations non vérifiées seront supprimés. Les déclarations vérifiées conserveront uniquement l'identification de la montre.",
                      tone: "danger",
                      confirmLabel: "Anonymiser",
                    }}
                  >
                    <Field label="Note de traitement" name="note">
                      <Textarea id="note" name="note" rows={2} maxLength={1000} />
                    </Field>
                    <div>
                      <SubmitButton variant="danger">Anonymiser le compte</SubmitButton>
                    </div>
                  </ActionForm>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
