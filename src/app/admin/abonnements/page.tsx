import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { stripeEnabled } from "@/server/env";
import { savePlan } from "@/server/actions/admin/platform";
import { PlanForm } from "@/components/admin/plan-form";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, Card, CardHeader, Notice, PageHeader, Pagination, Table } from "@/components/ui/primitives";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { pageParam, param } from "@/lib/utils";

export const metadata: Metadata = { title: "Abonnements" };
const PAGE_SIZE = 30;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const q = param(sp.q)?.trim().slice(0, 100);
  const statusP = param(sp.statut);
  const status = statusP && statusP in SUBSCRIPTION_STATUS_LABEL ? (statusP as SubscriptionStatus) : undefined;

  const where: Prisma.SubscriptionWhereInput = {};
  if (status) where.status = status;
  if (q) where.professionalProfile = { companyName: { contains: q, mode: "insensitive" } };

  const [plans, total, subs] = await Promise.all([
    db.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { subscriptions: true } } } }),
    db.subscription.count({ where }),
    db.subscription.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { plan: { select: { name: true } }, professionalProfile: { select: { id: true, companyName: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Facturation" title="Abonnements" description="Offres configurables et suivi des abonnements (synchronisés depuis Stripe par webhook)." />
      {!stripeEnabled() ? (
        <Notice tone="warn" className="mb-8">
          Stripe n'est pas configuré (STRIPE_SECRET_KEY). Seuls les accès manuels sont possibles.
        </Notice>
      ) : null}

      <section className="mb-12 grid gap-6">
        <h2 className="font-display text-3xl text-ink">Offres</h2>
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader
              title={plan.name}
              description={`${plan._count.subscriptions} abonnement(s) rattaché(s)`}
              action={plan.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
            />
            <div className="p-6">
              <PlanForm action={savePlan.bind(null, plan.id)} plan={plan} />
            </div>
          </Card>
        ))}
        <Card>
          <CardHeader title="Nouvelle offre" />
          <div className="p-6">
            <PlanForm action={savePlan.bind(null, null)} />
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-6 font-display text-3xl text-ink">Abonnements</h2>
        <FilterBar
          basePath="/admin/abonnements"
          q={q}
          qPlaceholder="Entreprise…"
          selects={[{ name: "statut", label: "Statut", value: status, options: Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([value, label]) => ({ value, label })) }]}
        />
        <Table>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Offre</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Échéance</th>
              <th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/admin/professionnels/${s.professionalProfile.id}`} className="hover:underline">
                    {s.professionalProfile.companyName}
                  </Link>
                </td>
                <td>{s.plan?.name ?? "—"}</td>
                <td>{s.source === "STRIPE" ? <span className="serial text-xs">{s.stripeSubscriptionId}</span> : "Manuel"}</td>
                <td>
                  <Badge tone={s.status === "ACTIVE" || s.status === "TRIALING" ? "ok" : s.status === "PAST_DUE" || s.status === "UNPAID" ? "warn" : "muted"}>
                    {SUBSCRIPTION_STATUS_LABEL[s.status]}
                  </Badge>
                  {s.cancelAtPeriodEnd ? <span className="block text-xs text-smoke">Résiliation programmée</span> : null}
                </td>
                <td className="whitespace-nowrap">{formatDate(s.currentPeriodEnd)}</td>
                <td className="whitespace-nowrap text-slate">{formatDate(s.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/abonnements" params={{ q, statut: status }} />
      </section>
    </>
  );
}
