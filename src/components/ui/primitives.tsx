import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "ok" | "warn" | "alert" | "muted" | "dark" | "brass";

const toneClasses: Record<Tone, string> = {
  neutral: "border-line-strong bg-paper text-graphite",
  ok: "border-ok/25 bg-ok-soft text-ok",
  warn: "border-warn/25 bg-warn-soft text-warn",
  alert: "border-alert/25 bg-alert-soft text-alert",
  muted: "border-line bg-mist text-slate",
  dark: "border-ink bg-ink text-ivory",
  brass: "border-brass/40 bg-transparent text-brass",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[11.5px] font-medium tracking-[0.03em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Marqueur visible et non ambigu des données fictives. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warn" className={cn("uppercase tracking-[0.12em]", className)}>
      Démonstration
    </Badge>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("border border-line bg-paper", className)}>{children}</div>;
}

export function CardHeader({ title, description, action, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5", className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl leading-[1.05] text-ink md:text-[2.75rem]">{title}</h1>
        {description ? <div className="mt-3 text-[15px] leading-relaxed text-slate">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-line-strong bg-paper/60 px-6 py-16 text-center">
      {icon ? <div className="mb-5 text-smoke">{icon}</div> : null}
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">{description}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: {
  tone?: "neutral" | "ok" | "warn" | "alert";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const border = { neutral: "border-anthracite", ok: "border-ok", warn: "border-warn", alert: "border-alert" }[tone];
  const bg = { neutral: "bg-mist", ok: "bg-ok-soft", warn: "bg-warn-soft", alert: "bg-alert-soft" }[tone];
  return (
    <div className={cn("border-l-2 px-5 py-4 text-sm leading-relaxed", border, bg, className)}>
      {title ? <p className="mb-1 font-semibold text-ink">{title}</p> : null}
      <div className="text-graphite">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="border border-line bg-paper px-6 py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-4xl leading-none text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-smoke">{hint}</p> : null}
    </div>
  );
}

export function DefinitionList({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
          <dt className="text-[13px] text-smoke">{it.label}</dt>
          <dd className="text-[14.5px] text-anthracite">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-line bg-paper", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-5 [&_td]:py-3.5 [&_th]:px-5 [&_th]:py-3 [&_th]:text-[11.5px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-smoke [&_tbody_tr:hover]:bg-ivory/70">
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, basePath, params }: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  const link = "inline-flex h-9 items-center gap-1 border border-line bg-paper px-3 text-sm hover:border-anthracite";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4 text-sm text-slate">
      <span>
        Page {page} sur {pages} · {total} élément{total > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={link} href={href(page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> Précédent
          </Link>
        ) : null}
        {page < pages ? (
          <Link className={link} href={href(page + 1)}>
            Suivant <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
