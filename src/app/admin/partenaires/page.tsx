import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DemoBadge, EmptyState, PageHeader, Table } from "@/components/ui/primitives";
import { PARTNER_TIER_LABEL } from "@/lib/labels";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Partenaires" };

export default async function AdminPartnersPage() {
  await requireAdmin();
  const partners = await db.partner.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        eyebrow="Revendeurs de confiance"
        title="Partenaires"
        actions={
          <ButtonLink href="/admin/partenaires/nouveau">
            <Plus className="size-4" aria-hidden /> Nouveau partenaire
          </ButtonLink>
        }
      />
      {partners.length === 0 ? (
        <EmptyState title="Aucun partenaire" description="Créez un premier partenaire pour alimenter la page publique." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Partenaire</th>
              <th>Localisation</th>
              <th>Publication</th>
              <th>Vérification</th>
              <th>Visibilité</th>
              <th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/partenaires/${p.id}`} className="font-medium text-ink hover:underline">
                    {p.name}
                  </Link>
                  {p.isDemo ? <DemoBadge className="ml-2" /> : null}
                </td>
                <td className="text-slate">
                  {p.city}, {countryName(p.country)}
                </td>
                <td>{p.isPublished ? <Badge tone="ok">Publié</Badge> : <Badge tone="muted">Brouillon</Badge>}</td>
                <td>{p.verified ? <Badge tone="dark">Vérifié</Badge> : <span className="text-smoke">—</span>}</td>
                <td className="text-sm">
                  {PARTNER_TIER_LABEL[p.tier]}
                  {p.isSponsored ? <Badge tone="brass" className="ml-2">Mise en avant</Badge> : null}
                </td>
                <td className="whitespace-nowrap text-slate">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
