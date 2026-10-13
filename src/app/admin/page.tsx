import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { Badge, Card, CardHeader, PageHeader, Stat, Table } from "@/components/ui/primitives";
import { AUDIT_CATEGORY_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export default async function AdminOverview() {
  await requireAdmin();
  const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const now = new Date();

  const [
    usersByRole,
    reportsByStatus,
    pendingPros,
    openMatches,
    searches7d,
    flagged7d,
    activeSubs,
    newReports7d,
    recentAudit,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], where: { status: { not: "DELETED" } }, _count: true }),
    db.theftReport.groupBy({ by: ["status"], _count: true }),
    db.professionalProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.potentialMatchReport.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.professionalSearch.count({ where: { createdAt: { gte: week }, blocked: false } }),
    db.professionalSearch.count({ where: { createdAt: { gte: week }, flagged: true } }),
    db.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] }, OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }] } }),
    db.theftReport.count({ where: { createdAt: { gte: week } } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, category: true, action: true, createdAt: true, actor: { select: { email: true } } },
    }),
  ]);

  const roleCount = (r: string) => usersByRole.find((u) => u.role === r)?._count ?? 0;
  const statusCount = (s: string) => reportsByStatus.find((r) => r.status === s)?._count ?? 0;

  const todo = [
    { label: "Déclarations à vérifier", count: statusCount("PENDING"), href: "/admin/declarations?statut=PENDING" },
    { label: "Professionnels à valider", count: pendingPros, href: "/admin/validations" },
    { label: "Signalements de possession ouverts", count: openMatches, href: "/admin/signalements" },
    { label: "Recherches anormales (7 j)", count: flagged7d, href: "/admin/recherches?anomalies=1" },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Vue générale" />

      <section className="mb-10">
        <h2 className="eyebrow mb-4">À traiter</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {todo.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="group flex items-center justify-between border border-line bg-paper px-5 py-4 transition-colors hover:border-anthracite"
            >
              <span className="text-sm text-graphite">{t.label}</span>
              <span className="flex items-center gap-3">
                <span className={t.count > 0 ? "font-display text-3xl text-ink" : "font-display text-3xl text-line-strong"}>{t.count}</span>
                <ArrowRight className="size-4 text-smoke group-hover:text-ink" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Particuliers" value={roleCount("INDIVIDUAL")} />
        <Stat label="Professionnels" value={roleCount("PROFESSIONAL")} />
        <Stat label="Abonnements actifs" value={activeSubs} />
        <Stat label="Recherches (7 j)" value={searches7d} />
        <Stat label="Déclarations vérifiées" value={statusCount("VERIFIED")} />
        <Stat label="Infos demandées" value={statusCount("INFO_REQUESTED")} />
        <Stat label="Montres retrouvées" value={statusCount("RECOVERED")} />
        <Stat label="Nouvelles déclarations (7 j)" value={newReports7d} />
      </section>

      <Card>
        <CardHeader
          title="Activité récente"
          action={
            <Link href="/admin/audit" className="text-sm text-slate underline underline-offset-4 hover:text-ink">
              Journal complet
            </Link>
          }
        />
        <Table className="border-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Action</th>
              <th>Acteur</th>
            </tr>
          </thead>
          <tbody>
            {recentAudit.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-slate">{formatDateTime(a.createdAt)}</td>
                <td>
                  <Badge tone={a.category === "SECURITY" ? "alert" : "neutral"}>{AUDIT_CATEGORY_LABEL[a.category]}</Badge>
                </td>
                <td className="serial text-[13px]">{a.action}</td>
                <td className="text-slate">{a.actor?.email ?? "Système"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
