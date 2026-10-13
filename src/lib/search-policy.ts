import { z } from "zod";
import "./zod-fr";
import { normalizeReference, normalizeSerial, normalizeText } from "./serial";

/**
 * Politique de recherche professionnelle — anti-extraction.
 *
 *  - Recherche par numéro de série : correspondance EXACTE sur la forme normalisée (≥ 4 caractères).
 *  - Recherche avancée : critères suffisamment discriminants exigés (une marque seule est refusée).
 *  - Résultats plafonnés (MAX_RESULTS), pas de pagination : impossible de parcourir la base.
 */
export const MAX_RESULTS = 10;
export const MIN_SERIAL_LENGTH = 4;
export const MIN_REFERENCE_LENGTH = 3;
export const MIN_MODEL_LENGTH = 2;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const searchInputSchema = z.object({
  mode: z.enum(["serial", "advanced"]),
  serial: text(64),
  brand: text(80),
  model: text(120),
  reference: text(64),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

export type NormalizedCriteria =
  | { type: "SERIAL"; serial: string }
  | {
      type: "ADVANCED";
      brand?: string;
      model?: string;
      reference?: string;
      serial?: string;
    };

export type PolicyResult =
  | { ok: true; criteria: NormalizedCriteria }
  | { ok: false; error: string };

export function evaluateSearchPolicy(input: SearchInput): PolicyResult {
  if (input.mode === "serial") {
    const serial = normalizeSerial(input.serial);
    if (serial.length < MIN_SERIAL_LENGTH) {
      return { ok: false, error: `Saisissez un numéro de série complet (au moins ${MIN_SERIAL_LENGTH} caractères).` };
    }
    return { ok: true, criteria: { type: "SERIAL", serial } };
  }

  const brand = normalizeText(input.brand) || undefined;
  const model = normalizeText(input.model) || undefined;
  const reference = normalizeReference(input.reference) || undefined;
  const serial = normalizeSerial(input.serial) || undefined;

  if (serial && serial.length < MIN_SERIAL_LENGTH) {
    return { ok: false, error: `Le numéro de série doit comporter au moins ${MIN_SERIAL_LENGTH} caractères.` };
  }
  if (reference && reference.length < MIN_REFERENCE_LENGTH) {
    return { ok: false, error: `La référence doit comporter au moins ${MIN_REFERENCE_LENGTH} caractères.` };
  }
  if (model && model.length < MIN_MODEL_LENGTH) {
    return { ok: false, error: "Le modèle saisi est trop court." };
  }

  const discriminant = Boolean(serial) || Boolean(reference) || (Boolean(brand) && Boolean(model));
  if (!discriminant) {
    return {
      ok: false,
      error:
        "Critères insuffisants : indiquez une référence, un numéro de série, ou une marque accompagnée d'un modèle.",
    };
  }

  return { ok: true, criteria: { type: "ADVANCED", brand, model, reference, serial } };
}
