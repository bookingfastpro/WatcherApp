import type { Metadata } from "next";
import { FileWarning } from "lucide-react";
import { db } from "@/server/db";
import { requireProArea } from "@/server/auth/guards";
import { Badge, EmptyState, PageHeader, Table } from "@/components/ui/primitives";
import { MATCH_CONTEXT_LABEL, MATCH_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Mes signalements" };

export default async function ProMatchReportsPage() {
  const { user } = await requireProArea();
  const rows = await db.potentialMatchReport.findMany({
    where: { reporterId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      context: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      theftReport: { select: { publicRef: true, watch: { select: { brand: true, model: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Coopération"
        title="Mes signalements"
        description="Suivi des possessions potentielles que vous avez signalées à l'équipe de la plateforme."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileWarning className="size-10" strokeWidth={1} />}
          title="Aucun signalement"
          description="Lorsqu'une montre qui vous est présentée correspond à une déclaration, signalez-le depuis sa fiche."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Déclaration</th>
              <th>Contexte</th>
              <th>Statut</th>
              <th>Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-slate">{formatDateTime(r.createdAt)}</td>
                <td>
                  <span className="serial text-[13px]">{r.theftReport.publicRef}</span>
                  <span className="block text-xs text-smoke">
                    {r.theftReport.watch.brand} {r.theftReport.watch.model}
                  </span>
                </td>
                <td>{MATCH_CONTEXT_LABEL[r.context]}</td>
                <td>
                  <Badge tone={r.status === "CLOSED" ? "muted" : r.status === "OPEN" ? "warn" : "neutral"}>{MATCH_STATUS_LABEL[r.status]}</Badge>
                </td>
                <td className="whitespace-nowrap text-slate">{formatDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
