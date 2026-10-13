import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ProVerificationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, DemoBadge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { ACTIVITY_LABEL, PRO_STATUS_LABEL, PRO_STATUS_TONE, SUBSCRIPTION_STATUS_LABEL } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Professionnels" };
const PAGE_SIZE = 30;

export default async function AdminProsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const statusP = param(sp.statut);
  const status = statusP && statusP in PRO_STATUS_LABEL ? (statusP as ProVerificationStatus) : undefined;

  const where: Prisma.ProfessionalProfileWhereInput = {};
  if (status) where.verificationStatus = status;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { legalName: { contains: q, mode: "insensitive" } },
      { registrationNumber: { contains: q } },
      { city: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.professionalProfile.count({ where }),
    db.professionalProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, isDemo: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true } },
        _count: { select: { searches: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Comptes" title="Professionnels" description={`${total} entreprise(s)`} />
      <FilterBar
        basePath="/admin/professionnels"
        q={q}
        qPlaceholder="Entreprise, SIRET, ville, email…"
        selects={[{ name: "statut", label: "Validation", value: status, options: Object.entries(PRO_STATUS_LABEL).map(([value, label]) => ({ value, label })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucun professionnel" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Activité</th>
                <th>Validation</th>
                <th>Abonnement</th>
                <th>Recherches</th>
                <th>Demande</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sub = p.subscriptions[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/professionnels/${p.id}`} className="font-medium text-ink hover:underline">
                        {p.companyName}
                      </Link>
                      {p.user.isDemo ? <DemoBadge className="ml-2" /> : null}
                      <span className="block text-xs text-smoke">
                        {p.city}, {countryName(p.country)} · {p.user.email}
                      </span>
                    </td>
                    <td>{ACTIVITY_LABEL[p.activity]}</td>
                    <td>
                      <Badge tone={PRO_STATUS_TONE[p.verificationStatus]}>{PRO_STATUS_LABEL[p.verificationStatus]}</Badge>
                    </td>
                    <td className="text-sm">
                      {sub ? (
                        <>
                          {SUBSCRIPTION_STATUS_LABEL[sub.status]}
                          <span className="block text-xs text-smoke">→ {formatDate(sub.currentPeriodEnd)}</span>
                        </>
                      ) : (
                        <span className="text-smoke">—</span>
                      )}
                    </td>
                    <td>{p._count.searches}</td>
                    <td className="whitespace-nowrap text-slate">{formatDate(p.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/professionnels" params={{ q, statut: status }} />
        </>
      )}
    </>
  );
}
