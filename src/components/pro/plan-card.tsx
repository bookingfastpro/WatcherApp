import { Check } from "lucide-react";
import { INTERVAL_LABEL } from "@/lib/labels";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PlanView = {
  id: string;
  name: string;
  description: string | null;
  interval: string;
  priceCents: number | null;
  currency: string;
  features: string[];
};

/** Carte d'offre. Le prix n'est affiché que s'il est renseigné (jamais de prix inventé). */
export function PlanCard({ plan, highlighted, children }: { plan: PlanView; highlighted?: boolean; children?: React.ReactNode }) {
  const price = formatPrice(plan.priceCents, plan.currency);
  return (
    <div className={cn("flex flex-col border p-8", highlighted ? "border-ink bg-ink text-ivory" : "border-line bg-paper text-anthracite")}>
      <p className={cn("eyebrow", highlighted && "!text-ivory/50")}>{plan.interval === "YEAR" ? "Annuel" : "Mensuel"}</p>
      <h3 className="mt-3 font-display text-3xl">{plan.name}</h3>
      {plan.description ? <p className={cn("mt-2 text-sm", highlighted ? "text-ivory/65" : "text-slate")}>{plan.description}</p> : null}
      <p className="mt-8">
        {price ? (
          <>
            <span className="font-display text-5xl">{price}</span>
            <span className={cn("ml-1 text-sm", highlighted ? "text-ivory/55" : "text-smoke")}>HT / {INTERVAL_LABEL[plan.interval]}</span>
          </>
        ) : (
          <span className={cn("text-sm", highlighted ? "text-ivory/65" : "text-slate")}>Tarif communiqué lors de la validation du compte</span>
        )}
      </p>
      {plan.features.length ? (
        <ul className="mt-8 space-y-3 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-3">
              <Check className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-ivory/70" : "text-ok")} aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="mt-auto pt-10">{children}</div> : null}
    </div>
  );
}
