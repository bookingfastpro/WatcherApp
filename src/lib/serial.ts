/**
 * Normalisation des identifiants horlogers.
 * Les numéros de série et références sont saisis de manière très hétérogène
 * ("116610LN", "116610 LN", "116.610-ln"). On compare toujours des formes normalisées.
 */

/** Majuscules, suppression des accents et de tout caractère non alphanumérique. */
export function normalizeIdentifier(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export const normalizeSerial = normalizeIdentifier;
export const normalizeReference = normalizeIdentifier;

/** Marque / modèle : minuscules, sans accents, espaces compactés (recherche "contient"). */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Masque un numéro de série en ne laissant visibles que les derniers caractères. */
export function maskSerial(serial: string | null | undefined, visible = 3): string | null {
  if (!serial) return null;
  const clean = serial.trim();
  if (clean.length <= visible) return "•".repeat(clean.length);
  return "•".repeat(Math.min(clean.length - visible, 8)) + clean.slice(-visible);
}
