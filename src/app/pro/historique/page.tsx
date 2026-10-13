import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { db } from "@/server/db";
import { requireProArea } from "@/server/auth/guards";
import { Badge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { pageParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Historique des recherches" };

const PAGE_SIZE = 25;

function describe(criteria: unknown): string {
  if (!criteria || typeof criteria !== "object") return "—";
  const c = criteria as Record<string, unknown>;
  return ["brand", "model", "reference", "serial"]
    .map((k) => c[k])
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" · ") || "—";
}

export default async function ProHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireProArea();
  const page = pageParam((await searchParams).page);
  const where = { userId: user.id };
  const [total, rows] = await Promise.all([
    db.professionalSearch.count({ where }),
    db.professionalSearch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Références publiques des correspondances (ids internes → refs).
  const ids = [...new Set(rows.flatMap((r) => r.matchedReportIds))];
  const refs = ids.length
    ? await db.theftReport.findMany({ where: { id: { in: ids } }, select: { id: true, publicRef: true } })
    : [];
  const refById = new Map(refs.map((r) => [r.id, r.publicRef]));
  const since = Date.now() - 24 * 3600 * 1000;

  return (
    <>
      <PageHeader
        eyebrow="Traçabilité"
        title="Historique des recherches"
        description="Chaque vérification est horodatée. Cet historique peut vous servir de justificatif de diligence."
      />
      {rows.length === 0 ? (
        <EmptyState icon={<History className="size-10" strokeWidth={1} />} title="Aucune recherche" description="Vos vérifications apparaîtront ici." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Critères</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-slate">{formatDateTime(r.createdAt)}</td>
                  <td>{r.type === "SERIAL" ? "N° de série" : "Avancée"}</td>
                  <td className="serial text-[13px]">{describe(r.criteria)}</td>
                  <td>
                    {r.blocked ? (
                      <Badge tone="muted">Non exécutée</Badge>
                    ) : r.resultCount === 0 ? (
                      <Badge tone="ok">Aucune correspondance</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {r.matchedReportIds.map((id) => {
                          const ref = refById.get(id);
                          if (!ref) return null;
                          return r.createdAt.getTime() > since ? (
                            <Link key={id} href={`/pro/declarations/${ref}`} className="serial text-[13px] text-alert underline underline-offset-2">
                              {ref}
                            </Link>
                          ) : (
                            <span key={id} className="serial text-[13px] text-alert">
                              {ref}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/pro/historique" />
        </>
      )}
    </>
  );
}
