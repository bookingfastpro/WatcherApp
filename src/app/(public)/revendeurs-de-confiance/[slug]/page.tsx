import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, ExternalLink, MapPin } from "lucide-react";
import { db } from "@/server/db";
import { PartnerLogo } from "@/components/partners/partner-card";
import { Badge, DemoBadge } from "@/components/ui/primitives";
import { PARTNER_CRITERIA, parsePartnerCriteria } from "@/lib/partner-criteria";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format";

async function load(slug: string) {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  return db.partner.findFirst({ where: { slug, isPublished: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.name, description: p.shortDescription } : { title: "Revendeur introuvable" };
}

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const partner = await load((await params).slug);
  if (!partner) notFound();
  const criteria = parsePartnerCriteria(partner.verificationCriteria);
  const sponsored = partner.isSponsored && (!partner.sponsoredUntil || partner.sponsoredUntil > new Date());
  const links = [
    { href: partner.website, label: "Site internet" },
    { href: partner.instagram, label: "Instagram" },
    { href: partner.facebook, label: "Facebook" },
    { href: partner.linkedin, label: "LinkedIn" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));

  return (
    <div className="bg-white lg:bg-ivory">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <Link href="/revendeurs-de-confiance" className="inline-flex items-center gap-2 text-sm text-slate hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Revendeurs de confiance
        </Link>

        <header className="mt-10 grid gap-10 border-b border-line pb-12 md:grid-cols-[auto_1fr] md:items-end">
          <PartnerLogo partner={partner} className="size-28 bg-paper" />
          <div>
            <div className="flex flex-wrap gap-2">
              {partner.verified ? (
                <Badge tone="dark">
                  <BadgeCheck className="size-3.5" aria-hidden /> Partenaire vérifié
                </Badge>
              ) : null}
              {sponsored ? <Badge tone="brass">Mise en avant</Badge> : null}
              {partner.isDemo ? <DemoBadge /> : null}
            </div>
            <h1 className="mt-5 font-display text-5xl leading-none text-ink md:text-6xl">{partner.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-slate">
              <MapPin className="size-4" aria-hidden /> {partner.city}, {countryName(partner.country)}
            </p>
          </div>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="font-display text-2xl leading-snug text-ink">{partner.shortDescription}</p>
            {partner.description ? (
              <div className="mt-8 whitespace-pre-line text-[15.5px] leading-relaxed text-graphite">{partner.description}</div>
            ) : null}
            {partner.specialties.length ? (
              <div className="mt-10">
                <p className="eyebrow">Spécialités</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {partner.specialties.map((s) => (
                    <li key={s} className="border border-line-strong bg-paper px-3 py-1 text-sm text-graphite">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            {links.length ? (
              <div className="border border-line bg-paper p-6">
                <p className="eyebrow">Contact</p>
                <ul className="mt-4 space-y-3">
                  {links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 text-sm text-ink underline-offset-4 hover:underline">
                        {l.label} <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {partner.verified ? (
              <div className="border border-line bg-paper p-6">
                <p className="eyebrow">Vérification</p>
                <ul className="mt-4 space-y-2.5">
                  {PARTNER_CRITERIA.filter((c) => criteria[c.key]).map((c) => (
                    <li key={c.key} className="flex gap-2.5 text-sm text-graphite">
                      <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {c.label}
                    </li>
                  ))}
                </ul>
                {partner.verifiedAt ? <p className="mt-4 text-xs text-smoke">Vérifié le {formatDate(partner.verifiedAt)}</p> : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
