import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { updateReport } from "@/server/actions/reports";
import { ReportForm } from "@/components/reports/report-form";
import { Notice, PageHeader } from "@/components/ui/primitives";
import { ownerCanEditReport } from "@/lib/permissions";

export const metadata: Metadata = { title: "Modifier la déclaration" };

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.theftReport.findFirst({ where: { id, ownerId: user.id }, include: { watch: true } });
  if (!report) notFound();
  if (!ownerCanEditReport(report.status)) redirect(`/espace/declarations/${report.id}`);
  const w = report.watch;

  return (
    <div className="max-w-3xl">
      <Link href={`/espace/declarations/${report.id}`} className="mb-8 inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Retour à la déclaration
      </Link>
      <PageHeader eyebrow={report.publicRef} title="Modifier la déclaration" />
      {report.status === "VERIFIED" ? (
        <Notice tone="warn" className="mb-10">
          Cette déclaration est vérifiée. Modifier la marque, le modèle, la référence ou le numéro de série la renverra en vérification.
        </Notice>
      ) : null}
      <ReportForm
        mode="edit"
        action={updateReport.bind(null, report.id)}
        defaults={{
          brand: w.brand,
          model: w.model,
          reference: w.reference,
          serialNumber: w.serialNumber,
          yearApprox: w.yearApprox,
          caseMaterial: w.caseMaterial,
          caseSizeMm: w.caseSizeMm,
          dialColor: w.dialColor,
          strap: w.strap,
          distinctiveMarks: w.distinctiveMarks,
          theftDate: report.theftDate.toISOString().slice(0, 10),
          theftCity: report.theftCity,
          theftCountry: report.theftCountry,
          circumstances: report.circumstances,
          privateDescription: report.privateDescription,
          policeReportFiled: report.policeReportFiled,
          policeReportNumber: report.policeReportNumber,
          policeService: report.policeService,
        }}
      />
    </div>
  );
}
