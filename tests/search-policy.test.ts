import { describe, expect, it } from "vitest";
import { evaluateSearchPolicy, searchInputSchema } from "@/lib/search-policy";
import { maskSerial, normalizeSerial, normalizeText } from "@/lib/serial";

const parse = (v: Record<string, string>) => searchInputSchema.parse(v);

describe("normalisation des identifiants", () => {
  it("ignore espaces, ponctuation, casse et accents", () => {
    expect(normalizeSerial(" 7f3-k2.291 ")).toBe("7F3K2291");
    expect(normalizeSerial("116610 ln")).toBe("116610LN");
    expect(normalizeSerial("é-1")).toBe("E1");
    expect(normalizeSerial(null)).toBe("");
  });
  it("normalise les libellés texte", () => {
    expect(normalizeText("  Jaeger-LeCoultre ")).toBe("jaeger lecoultre");
    expect(normalizeText("Hermès")).toBe("hermes");
  });
  it("masque les numéros de série", () => {
    expect(maskSerial("ABC123456")).toBe("••••••456");
    expect(maskSerial("AB")).toBe("••");
    expect(maskSerial(null)).toBeNull();
  });
});

describe("politique de recherche (anti-extraction)", () => {
  it("accepte un numéro de série complet", () => {
    const r = evaluateSearchPolicy(parse({ mode: "serial", serial: "7F3 K2291" }));
    expect(r).toEqual({ ok: true, criteria: { type: "SERIAL", serial: "7F3K2291" } });
  });

  it("refuse un numéro de série trop court (énumération)", () => {
    expect(evaluateSearchPolicy(parse({ mode: "serial", serial: "12" })).ok).toBe(false);
    expect(evaluateSearchPolicy(parse({ mode: "serial", serial: "--- " })).ok).toBe(false);
  });

  it("refuse une recherche avancée sur la seule marque", () => {
    const r = evaluateSearchPolicy(parse({ mode: "advanced", brand: "Rolex" }));
    expect(r.ok).toBe(false);
  });

  it("refuse une recherche avancée vide", () => {
    expect(evaluateSearchPolicy(parse({ mode: "advanced" })).ok).toBe(false);
  });

  it("accepte marque + modèle, ou une référence seule", () => {
    expect(evaluateSearchPolicy(parse({ mode: "advanced", brand: "Omega", model: "Speedmaster" })).ok).toBe(true);
    expect(evaluateSearchPolicy(parse({ mode: "advanced", reference: "311.30.42" })).ok).toBe(true);
  });

  it("refuse une référence trop courte", () => {
    expect(evaluateSearchPolicy(parse({ mode: "advanced", reference: "3" })).ok).toBe(false);
  });

  it("borne la longueur des champs", () => {
    expect(() => parse({ mode: "serial", serial: "A".repeat(65) })).toThrow();
  });
});
