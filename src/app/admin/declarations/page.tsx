import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ReportStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { DemoBadge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { REPORT_STATUS_LABEL } from "@/lib/labels";
import { formatDate, fullName } from "@/lib/format";
import { normalizeSerial } from "@/lib/serial";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Déclarations" };
const PAGE_SIZE = 30;
const STATUSES = Object.keys(REPORT_STATUS_LABEL) as ReportStatus[];

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const statusParam = param(sp.statut);
  const status = STATUSES.includes(statusParam as ReportStatus) ? (statusParam as ReportStatus) : undefined;

  const where: Prisma.TheftReportWhereInput = {};
  if (status) where.status = status;
  if (q) {
    const serial = normalizeSerial(q);
    where.OR = [
      { publicRef: { contains: q.toUpperCase() } },
      { watch: { brand: { contains: q, mode: "insensitive" } } },
      { watch: { model: { contains: q, mode: "insensitive" } } },
      ...(serial.length >= 3 ? [{ watch: { serialNormalized: { contains: serial } } }, { watch: { referenceNormalized: { contains: serial } } }] : []),
      { owner: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.theftReport.count({ where }),
    db.theftReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        publicRef: true,
        status: true,
        createdAt: true,
        isDemo: true,
        policeReportFiled: true,
        owner: { select: { email: true, firstName: true, lastName: true } },
        watch: { select: { brand: true, model: true, serialNumber: true } },
        _count: { select: { documents: true, matchReports: true, messages: { where: { fromAdmin: false, readAt: null, kind: "MESSAGE" } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Modération" title="Déclarations" description={`${total} déclaration(s)`} />
      <FilterBar
        basePath="/admin/declarations"
        q={q}
        qPlaceholder="Référence, marque, modèle, n° de série, email…"
        selects={[{ name: "statut", label: "Statut", value: status, options: STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABEL[s]! })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucune déclaration" description="Aucune déclaration ne correspond à ces critères." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Montre</th>
                <th>Déclarant</th>
                <th>Statut</th>
                <th>Pièces</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/declarations/${r.id}`} className="serial text-[13px] font-medium text-ink underline-offset-2 hover:underline">
                      {r.publicRef}
                    </Link>
                    {r.isDemo ? <DemoBadge className="ml-2" /> : null}
                  </td>
                  <td>
                    {r.watch.brand} {r.watch.model}
                    {r.watch.serialNumber ? <span className="serial block text-xs text-smoke">{r.watch.serialNumber}</span> : null}
                  </td>
                  <td className="text-slate">{fullName(r.owner)}</td>
                  <td>
                    <ReportStatusBadge status={r.status} />
                  </td>
                  <td className="text-xs text-slate">
                    {r._count.documents} doc. · {r.policeReportFiled ? "plainte" : "sans plainte"}
                    {r._count.messages ? <span className="ml-2 font-semibold text-ink">{r._count.messages} msg</span> : null}
                    {r._count.matchReports ? <span className="ml-2 font-semibold text-alert">{r._count.matchReports} signal.</span> : null}
                  </td>
                  <td className="whitespace-nowrap text-slate">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/declarations" params={{ q, statut: status }} />
        </>
      )}
    </>
  );
}
