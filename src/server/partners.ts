import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const PARTNER_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  city: true,
  country: true,
  specialties: true,
  shortDescription: true,
  logoKey: true,
  verified: true,
  isSponsored: true,
  sponsoredUntil: true,
  isDemo: true,
} satisfies Prisma.PartnerSelect;

/**
 * Partenaires publiés. La mise en avant commerciale (sponsoring) influence l'ORDRE d'affichage
 * et porte un libellé distinct ; elle n'a aucun effet sur le badge "Partenaire vérifié".
 */
export async function listPublishedPartners(filters: { q?: string; country?: string; city?: string; specialty?: string; take?: number }) {
  const and: Prisma.PartnerWhereInput[] = [{ isPublished: true }];
  if (filters.country) and.push({ country: filters.country });
  if (filters.city) and.push({ city: { contains: filters.city, mode: "insensitive" } });
  if (filters.specialty) and.push({ specialties: { has: filters.specialty } });
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } },
        { shortDescription: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  const rows = await db.partner.findMany({
    where: { AND: and },
    select: PARTNER_CARD_SELECT,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: filters.take ?? 60,
  });
  const now = new Date();
  const sponsoredNow = (p: (typeof rows)[number]) => p.isSponsored && (!p.sponsoredUntil || p.sponsoredUntil > now);
  return rows
    .map((p) => ({ ...p, isSponsored: sponsoredNow(p) }))
    .sort((a, b) => Number(b.isSponsored) - Number(a.isSponsored));
}

export async function partnerFacets() {
  const rows = await db.partner.findMany({ where: { isPublished: true }, select: { country: true, specialties: true } });
  const countries = [...new Set(rows.map((r) => r.country))].sort();
  const specialties = [...new Set(rows.flatMap((r) => r.specialties))].sort((a, b) => a.localeCompare(b, "fr"));
  return { countries, specialties };
}
