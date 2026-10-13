import { describe, expect, it } from "vitest";
import { SAFE_REPORT_SELECT, toSafeMatch } from "@/server/search";

/**
 * Test de non-régression de sécurité : la projection envoyée aux professionnels
 * ne doit contenir AUCUNE donnée personnelle ou confidentielle.
 */
const FORBIDDEN = [
  "owner",
  "ownerId",
  "documents",
  "messages",
  "circumstances",
  "privateDescription",
  "policeReportNumber",
  "policeService",
  "policeReportFiled",
  "theftDate",
  "theftCity",
  "theftCountry",
  "adminNotes",
  "statusReason",
  "matchReports",
  "verifiedBy",
  "email",
  "phone",
];

function keysDeep(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj).flatMap(([k, v]) => [k, ...keysDeep(v, `${prefix}${k}.`)]);
}

describe("projection de sécurité des résultats professionnels", () => {
  it("ne sélectionne aucun champ confidentiel", () => {
    const keys = keysDeep(SAFE_REPORT_SELECT);
    for (const f of FORBIDDEN) expect(keys).not.toContain(f);
  });

  it("filtre les images non autorisées", () => {
    expect(SAFE_REPORT_SELECT.watch.select.images.where).toEqual({
      visibleToProfessionals: true,
      moderationStatus: { not: "REJECTED" },
    });
  });

  const row = {
    id: "internal-id",
    publicRef: "SN-ABCD-EFGH",
    status: "VERIFIED" as const,
    createdAt: new Date("2026-03-04T10:00:00Z"),
    verifiedAt: new Date("2026-03-05T10:00:00Z"),
    isDemo: false,
    watch: {
      brand: "Omega",
      model: "Speedmaster",
      reference: "311.30.42.30.01.005",
      serialNumber: "81234567",
      yearApprox: 2018,
      caseMaterial: "Acier",
      caseSizeMm: 42,
      dialColor: "Noir",
      strap: "Acier",
      distinctiveMarks: "Rayure sur la lunette",
      images: [{ id: "img1" }],
    },
  };

  it("masque le numéro de série si non autorisé", () => {
    const masked = toSafeMatch(row, false);
    expect(masked.serial).toBe("•••••567");
    expect(masked.serialMasked).toBe(true);
    const full = toSafeMatch(row, true);
    expect(full.serial).toBe("81234567");
  });

  it("n'expose pas l'identifiant interne", () => {
    const out = toSafeMatch(row, true) as Record<string, unknown>;
    expect(out.id).toBeUndefined();
    expect(Object.keys(out)).not.toContain("verifiedAt");
  });
});
