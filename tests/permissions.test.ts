import { describe, expect, it } from "vitest";
import { can, ownerCanDeleteFiles, ownerCanEditReport, ownerCanMarkRecovered } from "@/lib/permissions";
import { meetsVerificationCriteria, parsePartnerCriteria } from "@/lib/partner-criteria";
import { generatePublicRef, isValidPublicRef } from "@/lib/public-ref";
import { safeNextPath } from "@/lib/session-cookie";

describe("matrice des permissions", () => {
  it("réserve la recherche aux professionnels et admins", () => {
    expect(can("INDIVIDUAL", "pro:search")).toBe(false);
    expect(can("PROFESSIONAL", "pro:search")).toBe(true);
    expect(can("ADMIN", "pro:search")).toBe(true);
    expect(can(null, "pro:search")).toBe(false);
  });

  it("réserve l'administration et les documents aux admins", () => {
    for (const p of ["admin:access", "admin:users", "document:read-any", "admin:audit"] as const) {
      expect(can("INDIVIDUAL", p)).toBe(false);
      expect(can("PROFESSIONAL", p)).toBe(false);
      expect(can("ADMIN", p)).toBe(true);
    }
  });

  it("encadre les modifications du propriétaire selon le statut", () => {
    expect(ownerCanEditReport("PENDING")).toBe(true);
    expect(ownerCanEditReport("REJECTED")).toBe(false);
    expect(ownerCanEditReport("RECOVERED")).toBe(false);
    expect(ownerCanDeleteFiles("VERIFIED")).toBe(false);
    expect(ownerCanDeleteFiles("INFO_REQUESTED")).toBe(true);
    expect(ownerCanMarkRecovered("RECOVERED")).toBe(false);
  });
});

describe("badge partenaire vérifié", () => {
  it("exige tous les critères obligatoires", () => {
    const partial = parsePartnerCriteria({ identityChecked: true, registrationChecked: true });
    expect(meetsVerificationCriteria(partial)).toBe(false);
    const full = parsePartnerCriteria({
      identityChecked: true,
      registrationChecked: true,
      premisesChecked: true,
      charterSigned: true,
    });
    expect(meetsVerificationCriteria(full)).toBe(true);
  });

  it("ignore les valeurs non booléennes ou inconnues", () => {
    expect(parsePartnerCriteria({ identityChecked: "true", sponsored: true })).toEqual({});
    expect(parsePartnerCriteria(null)).toEqual({});
  });
});

describe("identifiants publics", () => {
  it("génère des références valides et non séquentielles", () => {
    const refs = new Set(Array.from({ length: 200 }, () => generatePublicRef()));
    expect(refs.size).toBe(200);
    for (const r of refs) expect(isValidPublicRef(r)).toBe(true);
  });
  it("rejette les références malformées", () => {
    expect(isValidPublicRef("SN-1234")).toBe(false);
    expect(isValidPublicRef("SN-ABCD-EFGI")).toBe(false); // I exclu
    expect(isValidPublicRef("../etc/passwd")).toBe(false);
  });
});

describe("redirections après connexion", () => {
  it("n'autorise que des chemins internes", () => {
    expect(safeNextPath("/pro")).toBe("/pro");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined, "/x")).toBe("/x");
  });
});
