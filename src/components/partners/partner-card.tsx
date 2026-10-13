import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/primitives";
import { countryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

export type PartnerCardData = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  specialties: string[];
  shortDescription: string;
  logoKey: string | null;
  verified: boolean;
  isSponsored: boolean;
  isDemo: boolean;
};

export function PartnerLogo({ partner, className }: { partner: Pick<PartnerCardData, "id" | "name" | "logoKey">; className?: string }) {
  if (partner.logoKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/files/partner-logo/${partner.id}`} alt={`Logo ${partner.name}`} className={cn("object-contain", className)} />
    );
  }
  const initials = partner.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className={cn("flex items-center justify-center border border-line bg-ivory font-display text-2xl text-ink", className)} aria-hidden>
      {initials}
    </div>
  );
}

export function PartnerCard({ partner }: { partner: PartnerCardData }) {
  return (
    <Link
      href={`/revendeurs-de-confiance/${partner.slug}`}
      className="group flex h-full flex-col border border-line bg-paper p-7 transition-shadow duration-300 hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-4">
        <PartnerLogo partner={partner} className="size-16" />
        <div className="flex flex-col items-end gap-2">
          {partner.verified ? (
            <Badge tone="dark">
              <BadgeCheck className="size-3.5" aria-hidden /> Partenaire vérifié
            </Badge>
          ) : null}
          {partner.isSponsored ? <Badge tone="brass">Mise en avant</Badge> : null}
          {partner.isDemo ? <DemoBadge /> : null}
        </div>
      </div>
      <h3 className="mt-7 font-display text-[1.75rem] leading-tight text-ink">{partner.name}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate">
        <MapPin className="size-3.5" aria-hidden />
        {partner.city}, {countryName(partner.country)}
      </p>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-graphite">{partner.shortDescription}</p>
      {partner.specialties.length ? (
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {partner.specialties.slice(0, 4).map((s) => (
            <li key={s} className="border border-line px-2 py-0.5 text-[11.5px] text-slate">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-medium text-ink">
        Découvrir <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
