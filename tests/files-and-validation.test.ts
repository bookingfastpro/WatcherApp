import { describe, expect, it } from "vitest";
import { sanitizeFileName, sniffFileType } from "@/lib/file-signature";
import { passwordSchema, registerIndividualSchema } from "@/lib/validation/auth";
import { reportSchema } from "@/lib/validation/report";
import { parseSettings, DEFAULT_SETTINGS } from "@/lib/settings-schema";

const bytes = (...b: number[]) => new Uint8Array(b);

describe("détection du type réel des fichiers", () => {
  it("reconnaît JPEG, PNG, WebP et PDF", () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffFileType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffFileType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
  });
  it("rejette les contenus déguisés", () => {
    expect(sniffFileType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffFileType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffFileType(bytes(0x4d, 0x5a))).toBeNull(); // exécutable Windows
    expect(sniffFileType(bytes())).toBeNull();
  });
  it("nettoie les noms de fichiers", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\temp\\plainte<script>.pdf")).toBe("plainte_script_.pdf");
    expect(sanitizeFileName("Facture été.pdf")).toBe("Facture ete.pdf");
    expect(sanitizeFileName("")).toBe("fichier");
  });
});

describe("validation des entrées", () => {
  it("impose une politique de mot de passe", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    expect(passwordSchema.safeParse("aaaaaaaaaaaaaaa").success).toBe(false);
    expect(passwordSchema.safeParse("password1234").success).toBe(false);
    expect(passwordSchema.safeParse("montre-volee-2026").success).toBe(true);
  });

  it("exige les consentements à l'inscription", () => {
    const base = { firstName: "A", lastName: "B", email: "a@b.fr", password: "montre-volee-2026" };
    expect(registerIndividualSchema.safeParse(base).success).toBe(false);
    const ok = registerIndividualSchema.safeParse({ ...base, acceptTerms: "on", acceptPrivacy: "on" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.marketingConsent).toBe(false);
      expect(ok.data.email).toBe("a@b.fr");
    }
  });

  it("valide une déclaration et exige la référence de plainte si déclarée", () => {
    const base = {
      brand: "Omega",
      model: "Seamaster",
      theftDate: "2026-01-10",
      theftCity: "Lyon",
      theftCountry: "FR",
      certify: "on",
    };
    expect(reportSchema.safeParse({ ...base, policeReportFiled: "no" }).success).toBe(true);
    const missing = reportSchema.safeParse({ ...base, policeReportFiled: "yes" });
    expect(missing.success).toBe(false);
    expect(reportSchema.safeParse({ ...base, policeReportFiled: "yes", policeReportNumber: "PV-2026-001" }).success).toBe(true);
  });

  it("refuse une date de vol future et une déclaration non certifiée", () => {
    const base = { brand: "Omega", model: "Seamaster", theftCity: "Lyon", theftCountry: "FR", policeReportFiled: "no" };
    expect(reportSchema.safeParse({ ...base, theftDate: "2999-01-01", certify: "on" }).success).toBe(false);
    expect(reportSchema.safeParse({ ...base, theftDate: "2026-01-01" }).success).toBe(false);
  });

  it("applique des valeurs par défaut sûres aux paramètres", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ graceDays: 999 })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ graceDays: 3 }).graceDays).toBe(3);
  });
});
