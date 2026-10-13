import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/server/auth/guards";
import { savePartner } from "@/server/actions/admin/partners";
import { PartnerForm } from "@/components/admin/partner-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nouveau partenaire" };

export default async function NewPartnerPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/partenaires" className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Partenaires
      </Link>
      <PageHeader title="Nouveau partenaire" />
      <PartnerForm action={savePartner.bind(null, null)} />
    </div>
  );
}
