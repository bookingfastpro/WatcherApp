import Link from "next/link";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { ReportStatusBadge } from "./status-badge";
import { WatchImage } from "./watch-image";
import { DemoBadge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

type Props = {
  report: {
    id: string;
    publicRef: string;
    status: string;
    createdAt: Date;
    isDemo: boolean;
    unread: number;
    watch: { brand: string; model: string; reference: string | null; images: { id: string }[] };
  };
};

export function OwnerWatchCard({ report }: Props) {
  const w = report.watch;
  return (
    <Link
      href={`/espace/declarations/${report.id}`}
      className="group flex flex-col border border-line bg-paper transition-shadow duration-300 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <WatchImage
          imageId={w.images[0]?.id}
          alt={`${w.brand} ${w.model}`}
          className="size-full transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.02]"
        />
        <div className="absolute left-4 top-4 flex gap-2">
          <ReportStatusBadge status={report.status} />
          {report.isDemo ? <DemoBadge /> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow">{w.brand}</p>
        <h3 className="mt-2 font-display text-[1.7rem] leading-tight text-ink">{w.model}</h3>
        {w.reference ? <p className="serial mt-1 text-sm text-slate">Réf. {w.reference}</p> : null}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs text-smoke">
          <span className="serial">{report.publicRef}</span>
          <span className="flex items-center gap-3">
            {report.unread > 0 ? (
              <span className="inline-flex items-center gap-1 text-ink">
                <MessageSquare className="size-3.5" aria-hidden /> {report.unread}
              </span>
            ) : null}
            {formatDate(report.createdAt)}
            <ArrowUpRight className="size-4 text-ink opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
