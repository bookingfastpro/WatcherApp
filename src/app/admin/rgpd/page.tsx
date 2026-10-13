import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { rejectDataRequest } from "@/server/actions/admin/users";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form-fields";
import { Badge, EmptyState, Notice, PageHeader, Table } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Demandes RGPD" };

const STATUS: Record<string, string> = { PENDING: "À traiter", COMPLETED: "Traitée", REJECTED: "Refusée" };

export default async function AdminGdprPage() {
  await requireAdmin();
  const rows = await db.dataRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 200,
    include: { user: { select: { id: true, email: true } }, processedBy: { select: { email: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Conformité"
        title="Demandes RGPD"
        description="Délai de réponse légal : un mois à compter de la réception (prolongeable dans certains cas). Les exports sont réalisés en libre-service par les utilisateurs."
      />
      <Notice tone="warn" className="mb-8">
        Avant toute anonymisation, vérifiez qu'aucune obligation légale ou procédure en cours n'impose la conservation (à définir avec votre conseil juridique).
      </Notice>
      {rows.length === 0 ? (
        <EmptyState title="Aucune demande" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Reçue le</th>
              <th>Utilisateur</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Traitement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-slate">{formatDateTime(r.createdAt)}</td>
                <td>
                  <Link href={`/admin/utilisateurs/${r.user.id}`} className="underline">
                    {r.user.email}
                  </Link>
                  {r.note ? <span className="block max-w-xs truncate text-xs text-smoke">{r.note}</span> : null}
                </td>
                <td>{r.type === "DELETION" ? "Suppression" : "Export"}</td>
                <td>
                  <Badge tone={r.status === "PENDING" ? "warn" : r.status === "COMPLETED" ? "ok" : "muted"}>{STATUS[r.status]}</Badge>
                </td>
                <td>
                  {r.status === "PENDING" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/admin/utilisateurs/${r.user.id}`} className="text-sm font-medium underline">
                        Traiter
                      </Link>
                      <ActionForm action={rejectDataRequest.bind(null, r.id)} className="flex gap-2" showInlineError={false}>
                        <Input name="note" placeholder="Motif du refus" aria-label="Motif du refus" className="h-9 w-48 text-sm" />
                        <SubmitButton variant="ghost" size="sm">
                          Refuser
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  ) : (
                    <span className="text-xs text-smoke">
                      {formatDateTime(r.processedAt)} · {r.processedBy?.email ?? "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
