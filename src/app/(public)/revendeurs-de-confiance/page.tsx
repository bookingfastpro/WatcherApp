import type { Metadata } from "next";
import { Search } from "lucide-react";
import { listPublishedPartners, partnerFacets } from "@/server/partners";
import { PartnerCard } from "@/components/partners/partner-card";
import { Input, Select } from "@/components/ui/form-fields";
import { buttonClasses } from "@/components/ui/button";
import { PARTNER_CRITERIA } from "@/lib/partner-criteria";
import { countryName } from "@/lib/countries";
import { param } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Revendeurs de confiance",
  description: "Professionnels de l'horlogerie engagés dans la lutte contre le recel de montres volées.",
};

export default async function PartnersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = {
    q: param(sp.q)?.slice(0, 80) || undefined,
    country: param(sp.pays)?.slice(0, 2) || undefined,
    city: param(sp.ville)?.slice(0, 80) || undefined,
    specialty: param(sp.specialite)?.slice(0, 80) || undefined,
  };
  const [partners, facets] = await Promise.all([listPublishedPartners(filters), partnerFacets()]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 md:px-8 md:pb-24 md:pt-24">
          <p className="eyebrow !text-ivory/45">Revendeurs de confiance</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.04] md:text-6xl">Des professionnels qui vérifient avant d'acheter.</h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ivory/60">
            Chaque partenaire présenté ici s'engage à contrôler systématiquement l'origine des montres qu'il acquiert.
            Le badge « Partenaire vérifié » est attribué selon des critères précis, indépendamment de toute relation commerciale.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <form className="mx-auto grid max-w-7xl gap-3 px-5 py-6 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:px-8" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-smoke" aria-hidden />
            <Input name="q" defaultValue={filters.q} placeholder="Nom, ville…" aria-label="Rechercher" className="pl-10" />
          </div>
          <Input name="ville" defaultValue={filters.city} placeholder="Ville" aria-label="Ville" />
          <Select name="pays" defaultValue={filters.country ?? ""} aria-label="Pays">
            <option value="">Tous les pays</option>
            {facets.countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c)}
              </option>
            ))}
          </Select>
          <Select name="specialite" defaultValue={filters.specialty ?? ""} aria-label="Spécialité">
            <option value="">Toutes spécialités</option>
            {facets.specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonClasses("primary", "md")}>
            Filtrer
          </button>
        </form>
      </section>

      <section className="bg-white lg:bg-ivory">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          {partners.length ? (
            <>
              <p className="mb-8 text-sm text-slate">
                {partners.length} professionnel{partners.length > 1 ? "s" : ""}
                {filtered ? " correspondant à votre recherche" : ""}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {partners.map((p) => (
                  <PartnerCard key={p.id} partner={p} />
                ))}
              </div>
            </>
          ) : (
            <div className="border border-dashed border-line-strong px-8 py-20 text-center">
              <p className="font-display text-3xl text-ink">{filtered ? "Aucun résultat" : "Aucun revendeur publié pour le moment"}</p>
              <p className="mt-3 text-sm text-slate">
                {filtered ? "Essayez d'élargir vos critères." : "Les premiers partenaires vérifiés seront présentés ici."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Transparence</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink">Critères du badge « Partenaire vérifié »</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate">
              Les mentions « Mise en avant » signalent une visibilité commerciale. Elles ne constituent pas une garantie
              et n'influencent jamais l'attribution du badge.
            </p>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {PARTNER_CRITERIA.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-6 py-4 text-[15px] text-graphite">
                {c.label}
                <span className="text-xs text-smoke">{c.required ? "Obligatoire" : "Complémentaire"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
