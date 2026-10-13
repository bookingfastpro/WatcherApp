import type { Metadata } from "next";
import type { AuditCategory, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { AUDIT_CATEGORY_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal d'audit" };
const PAGE_SIZE = 50;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const catP = param(sp.categorie);
  const category = catP && catP in AUDIT_CATEGORY_LABEL ? (catP as AuditCategory) : undefined;

  const where: Prisma.AuditLogWhereInput = {};
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { targetId: q },
      { actor: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Traçabilité"
        title="Journal d'audit"
        description="Actions administratives, événements de sécurité, accès aux données sensibles et facturation. Lecture seule."
      />
      <FilterBar
        basePath="/admin/audit"
        q={q}
        qPlaceholder="Action, email de l'acteur, identifiant cible…"
        selects={[{ name: "categorie", label: "Catégorie", value: category, options: Object.entries(AUDIT_CATEGORY_LABEL).map(([value, label]) => ({ value, label })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucune entrée" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Action</th>
                <th>Acteur</th>
                <th>Cible</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-slate">{formatDateTime(a.createdAt)}</td>
                  <td>
                    <Badge tone={a.category === "SECURITY" ? "alert" : a.category === "ACCESS" ? "warn" : "neutral"}>{AUDIT_CATEGORY_LABEL[a.category]}</Badge>
                  </td>
                  <td className="serial text-[13px]">{a.action}</td>
                  <td className="text-slate">{a.actor?.email ?? "Système / anonyme"}</td>
                  <td className="serial text-xs text-smoke">{a.targetType ? `${a.targetType} ${a.targetId?.slice(0, 10) ?? ""}` : "—"}</td>
                  <td className="max-w-xs">
                    {a.metadata ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-slate">Voir</summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap bg-mist p-2 text-[11px]">{JSON.stringify(a.metadata, null, 2)}</pre>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/audit" params={{ q, categorie: category }} />
        </>
      )}
    </>
  );
}
