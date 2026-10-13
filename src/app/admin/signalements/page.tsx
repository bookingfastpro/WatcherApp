import type { Metadata } from "next";
import Link from "next/link";
import type { MatchReportStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { MATCH_CONTEXT_LABEL, MATCH_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Signalements" };
const PAGE_SIZE = 30;

export default async function AdminMatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const statusP = param(sp.statut);
  const status = statusP && statusP in MATCH_STATUS_LABEL ? (statusP as MatchReportStatus) : undefined;
  const q = param(sp.q)?.trim().slice(0, 100);

  const where: Prisma.PotentialMatchReportWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { theftReport: { publicRef: { contains: q.toUpperCase() } } },
      { professionalProfile: { companyName: { contains: q, mode: "insensitive" } } },
    ];
  }
  const [total, rows] = await Promise.all([
    db.potentialMatchReport.count({ where }),
    db.potentialMatchReport.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        theftReport: { select: { publicRef: true, watch: { select: { brand: true, model: true } } } },
        professionalProfile: { select: { companyName: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Coopération"
        title="Signalements de possession"
        description="Professionnels indiquant être potentiellement en possession d'une montre déclarée. À traiter en priorité."
      />
      <FilterBar
        basePath="/admin/signalements"
        q={q}
        qPlaceholder="Référence de déclaration, entreprise…"
        selects={[{ name: "statut", label: "Statut", value: status, options: Object.entries(MATCH_STATUS_LABEL).map(([value, label]) => ({ value, label })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucun signalement" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Déclaration</th>
                <th>Professionnel</th>
                <th>Contexte</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/signalements/${m.id}`} className="font-medium hover:underline">
                      {formatDateTime(m.createdAt)}
                    </Link>
                  </td>
                  <td>
                    <span className="serial text-[13px]">{m.theftReport.publicRef}</span>
                    <span className="block text-xs text-smoke">
                      {m.theftReport.watch.brand} {m.theftReport.watch.model}
                    </span>
                  </td>
                  <td>{m.professionalProfile?.companyName ?? "—"}</td>
                  <td>{MATCH_CONTEXT_LABEL[m.context]}</td>
                  <td>
                    <Badge tone={m.status === "OPEN" ? "alert" : m.status === "CLOSED" ? "muted" : "warn"}>{MATCH_STATUS_LABEL[m.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/signalements" params={{ q, statut: status }} />
        </>
      )}
    </>
  );
}
