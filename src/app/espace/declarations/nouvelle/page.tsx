import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guards";
import { createReport } from "@/server/actions/reports";
import { ReportForm } from "@/components/reports/report-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nouvelle déclaration" };

export default async function NewReportPage() {
  await requirePermission("report:create");
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Déclaration de vol"
        title="Déclarer une montre volée"
        description="Comptez environ 10 minutes. Les informations marquées « Confidentiel » ne sont jamais communiquées aux professionnels."
      />
      <ReportForm mode="create" action={createReport} />
    </div>
  );
}
