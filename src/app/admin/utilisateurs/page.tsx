import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, Role, UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, DemoBadge, EmptyState, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { ROLE_LABEL, USER_STATUS_LABEL } from "@/lib/labels";
import { formatDate, fullName } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Utilisateurs" };
const PAGE_SIZE = 30;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const roleP = param(sp.role);
  const statusP = param(sp.statut);
  const role = roleP && roleP in ROLE_LABEL ? (roleP as Role) : undefined;
  const status = statusP && statusP in USER_STATUS_LABEL ? (statusP as UserStatus) : undefined;

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { professionalProfile: { companyName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        isDemo: true,
        professionalProfile: { select: { companyName: true } },
        _count: { select: { theftReports: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Comptes" title="Utilisateurs" description={`${total} compte(s)`} />
      <FilterBar
        basePath="/admin/utilisateurs"
        q={q}
        qPlaceholder="Email, nom, entreprise…"
        selects={[
          { name: "role", label: "Rôle", value: role, options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "statut", label: "Statut", value: status, options: Object.entries(USER_STATUS_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Déclarations</th>
                <th>Inscription</th>
                <th>Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/utilisateurs/${u.id}`} className="font-medium text-ink hover:underline">
                      {fullName(u)}
                    </Link>
                    {u.isDemo ? <DemoBadge className="ml-2" /> : null}
                    <span className="block text-xs text-smoke">
                      {u.email}
                      {u.professionalProfile ? ` · ${u.professionalProfile.companyName}` : ""}
                    </span>
                  </td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <Badge tone={u.status === "ACTIVE" ? (u.emailVerifiedAt ? "ok" : "warn") : "alert"}>
                      {u.status === "ACTIVE" && !u.emailVerifiedAt ? "Email non vérifié" : USER_STATUS_LABEL[u.status]}
                    </Badge>
                  </td>
                  <td>{u._count.theftReports}</td>
                  <td className="whitespace-nowrap text-slate">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap text-slate">{formatDate(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/utilisateurs" params={{ q, role, statut: status }} />
        </>
      )}
    </>
  );
}
