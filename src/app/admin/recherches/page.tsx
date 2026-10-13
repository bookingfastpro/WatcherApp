import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, PageHeader, Pagination, Stat, Table } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Recherches professionnelles" };
const PAGE_SIZE = 50;

function describe(criteria: unknown): string {
  if (!criteria || typeof criteria !== "object") return "—";
  const c = criteria as Record<string, unknown>;
  return ["brand", "model", "reference", "serial"].map((k) => c[k]).filter((v): v is string => typeof v === "string" && v.length > 0).join(" · ") || "—";
}

export default async function AdminSearchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const filter = param(sp.filtre);
  const anomalies = param(sp.anomalies) === "1" || filter === "anomalies";

  const where: Prisma.ProfessionalSearchWhereInput = {};
  if (anomalies) where.flagged = true;
  if (filter === "bloquees") where.blocked = true;
  if (filter === "positives") where.resultCount = { gt: 0 };
  if (q) {
    where.OR = [
      { user: { email: { contains: q, mode: "insensitive" } } },
      { professionalProfile: { companyName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const day = new Date(Date.now() - 24 * 3600 * 1000);
  const [total, rows, last24, blocked24, positive24, topUsers] = await Promise.all([
    db.professionalSearch.count({ where }),
    db.professionalSearch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, email: true } }, professionalProfile: { select: { companyName: true } } },
    }),
    db.professionalSearch.count({ where: { createdAt: { gte: day } } }),
    db.professionalSearch.count({ where: { createdAt: { gte: day }, blocked: true } }),
    db.professionalSearch.count({ where: { createdAt: { gte: day }, resultCount: { gt: 0 } } }),
    db.professionalSearch.groupBy({ by: ["userId"], where: { createdAt: { gte: day } }, _count: true, orderBy: { _count: { userId: "desc" } }, take: 5 }),
  ]);
  const topEmails = await db.user.findMany({ where: { id: { in: topUsers.map((t) => t.userId) } }, select: { id: true, email: true } });

  return (
    <>
      <PageHeader eyebrow="Sécurité" title="Recherches professionnelles" description="Historique complet, détection d'anomalies et d'extraction." />
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Recherches (24 h)" value={last24} />
        <Stat label="Avec correspondance (24 h)" value={positive24} />
        <Stat label="Bloquées (24 h)" value={blocked24} hint="Quota, débit ou critères insuffisants" />
        <div className="border border-line bg-paper px-6 py-5">
          <p className="eyebrow">Plus actifs (24 h)</p>
          <ul className="mt-3 space-y-1 text-sm">
            {topUsers.map((t) => (
              <li key={t.userId} className="flex justify-between gap-2">
                <span className="truncate">{topEmails.find((u) => u.id === t.userId)?.email}</span>
                <span className="font-medium">{t._count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <FilterBar
        basePath="/admin/recherches"
        q={q}
        qPlaceholder="Email, entreprise…"
        selects={[
          {
            name: "filtre",
            label: "Filtre",
            value: anomalies ? "anomalies" : filter,
            options: [
              { value: "anomalies", label: "Anomalies" },
              { value: "bloquees", label: "Bloquées" },
              { value: "positives", label: "Avec correspondance" },
            ],
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucune recherche" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Type</th>
                <th>Critères</th>
                <th>Résultat</th>
                <th>IP (pseud.)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={s.flagged ? "bg-alert-soft/60" : undefined}>
                  <td className="whitespace-nowrap text-slate">{formatDateTime(s.createdAt)}</td>
                  <td>
                    <Link href={`/admin/utilisateurs/${s.user.id}`} className="hover:underline">
                      {s.user.email}
                    </Link>
                    {s.professionalProfile ? <span className="block text-xs text-smoke">{s.professionalProfile.companyName}</span> : null}
                  </td>
                  <td>{s.type === "SERIAL" ? "N° série" : "Avancée"}</td>
                  <td className="serial text-[13px]">{describe(s.criteria)}</td>
                  <td>
                    {s.blocked ? (
                      <Badge tone="muted">Bloquée · {s.blockReason}</Badge>
                    ) : s.resultCount ? (
                      <Badge tone="alert">{s.resultCount} corresp.</Badge>
                    ) : (
                      <Badge tone="ok">0</Badge>
                    )}
                    {s.flagged ? <Badge tone="alert" className="ml-2">Anomalie</Badge> : null}
                  </td>
                  <td className="serial text-xs text-smoke">{s.ipHash?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/recherches" params={{ q, filtre: anomalies ? "anomalies" : filter }} />
        </>
      )}
    </>
  );
}
