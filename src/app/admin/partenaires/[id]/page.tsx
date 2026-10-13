import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { deletePartner, savePartner } from "@/server/actions/admin/partners";
import { PartnerForm } from "@/components/admin/partner-form";
import { PartnerLogo } from "@/components/partners/partner-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { DemoBadge, Notice, PageHeader } from "@/components/ui/primitives";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Partenaire" };

export default async function EditPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/partenaires" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Partenaires
      </Link>
      <div className="mb-6 flex items-center gap-5">
        <PartnerLogo partner={partner} className="size-16" />
        {partner.isDemo ? <DemoBadge /> : null}
      </div>
      <PageHeader
        title={partner.name}
        actions={
          partner.isPublished ? (
            <a href={`/revendeurs-de-confiance/${partner.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm underline">
              Voir la page publique <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null
        }
      />
      {param(sp.cree) ? <Notice tone="ok" className="mb-8">Partenaire créé.</Notice> : null}
      <PartnerForm action={savePartner.bind(null, partner.id)} partner={partner} />
      <div className="mt-16 border-t border-line pt-8">
        <ActionForm
          action={deletePartner.bind(null, partner.id)}
          confirm={{ title: `Supprimer ${partner.name} ?`, description: "La fiche publique sera immédiatement retirée.", tone: "danger", confirmLabel: "Supprimer" }}
        >
          <SubmitButton variant="ghost" className="text-alert">
            Supprimer ce partenaire
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
