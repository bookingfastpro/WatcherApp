import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertKind = "stolen" | "unverified" | "recovered" | "clear";

export function alertKindFor(statuses: string[]): AlertKind {
  if (statuses.includes("VERIFIED")) return "stolen";
  if (statuses.some((s) => s === "PENDING" || s === "INFO_REQUESTED")) return "unverified";
  if (statuses.includes("RECOVERED")) return "recovered";
  return "clear";
}

const CONTENT: Record<AlertKind, { title: string; text: string; icon: React.ReactNode; className: string }> = {
  stolen: {
    title: "Montre signalée volée",
    text: "Une déclaration vérifiée correspond. Ne finalisez pas la transaction et signalez la situation à notre équipe.",
    icon: <AlertTriangle className="size-7" aria-hidden />,
    className: "bg-alert text-ivory",
  },
  unverified: {
    title: "Signalement en cours de vérification",
    text: "Une déclaration de vol correspond mais n'a pas encore été vérifiée. Faites preuve d'une vigilance renforcée.",
    icon: <Clock className="size-7" aria-hidden />,
    className: "bg-warn text-ivory",
  },
  recovered: {
    title: "Montre déclarée retrouvée",
    text: "Cette montre avait été déclarée volée puis retrouvée par son propriétaire. Vérifiez la provenance comme à l'accoutumée.",
    icon: <RotateCcw className="size-7" aria-hidden />,
    className: "bg-graphite text-ivory",
  },
  clear: {
    title: "Aucune déclaration correspondante",
    text: "Aucune montre déclarée volée ne correspond à ces critères dans notre base. L'absence de résultat ne constitue pas une garantie d'origine licite.",
    icon: <CheckCircle2 className="size-7" aria-hidden />,
    className: "border border-line bg-paper text-anthracite",
  },
};

export function MatchAlert({ kind, className }: { kind: AlertKind; className?: string }) {
  const c = CONTENT[kind];
  return (
    <div role={kind === "clear" ? "status" : "alert"} className={cn("flex items-start gap-5 px-6 py-6 md:px-8 fade-in", c.className, className)}>
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <div>
        <p className={cn("text-[1.35rem] font-semibold leading-tight", kind !== "clear" && "uppercase tracking-[0.08em]")}>{c.title}</p>
        <p className={cn("mt-2 max-w-2xl text-sm leading-relaxed", kind === "clear" ? "text-slate" : "text-ivory/85")}>{c.text}</p>
      </div>
    </div>
  );
}
