import { Badge } from "@/components/ui/primitives";
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from "@/lib/labels";

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={REPORT_STATUS_TONE[status] ?? "neutral"}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {REPORT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
