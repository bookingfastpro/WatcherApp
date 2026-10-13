import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ACTIVITY_LABEL } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Demandes de validation" };

export default async function AdminValidationsPage() {
  await requireAdmin();
  const rows = await db.professionalProfile.findMany({
    where: { verificationStatus: "PENDING" },
    orderBy: { submittedAt: "asc" },
    include: { user: { select: { email: true, emailVerifiedAt: true } }, _count: { select: { documents: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="File d'attente"
        title="Demandes de validation"
        description="Du plus ancien au plus récent. Vérifiez l'immatriculation (registre officiel), le justificatif et la cohérence de l'activité."
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BadgeCheck className="size-10" strokeWidth={1} />} title="Aucune demande en attente" />
      ) : (
        <ul className="grid gap-3">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/professionnels/${p.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 border border-line bg-paper px-6 py-5 transition-colors hover:border-anthracite"
              >
                <div>
                  <p className="font-display text-2xl text-ink">{p.companyName}</p>
                  <p className="mt-1 text-sm text-slate">
                    {ACTIVITY_LABEL[p.activity]} · {p.city}, {countryName(p.country)} · <span className="serial">{p.registrationNumber}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!p.user.emailVerifiedAt ? <Badge tone="warn">Email non vérifié</Badge> : null}
                  <Badge tone={p._count.documents ? "ok" : "alert"}>{p._count.documents ? `${p._count.documents} justificatif(s)` : "Sans justificatif"}</Badge>
                  <span className="text-xs text-smoke">{formatDateTime(p.submittedAt)}</span>
                  <ArrowRight className="size-4 text-smoke group-hover:text-ink" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
