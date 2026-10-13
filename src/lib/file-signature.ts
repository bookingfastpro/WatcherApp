/**
 * Détection du type réel d'un fichier par ses "magic bytes".
 * On ne fait jamais confiance à l'extension ni au Content-Type envoyé par le navigateur.
 */
export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffFileType(bytes: Uint8Array): SniffedType | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 &&
    b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && // RIFF
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  if (bytes.length >= 5 && b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46 && b(4) === 0x2d) {
    return "application/pdf"; // %PDF-
  }
  return null;
}

export const IMAGE_TYPES: readonly SniffedType[] = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES: readonly SniffedType[] = [...IMAGE_TYPES, "application/pdf"];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS_PER_REPORT = 8;
export const MAX_DOCUMENTS_PER_REPORT = 10;

/** Nettoie un nom de fichier fourni par l'utilisateur (stocké pour affichage uniquement). */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "fichier";
  const cleaned = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : "fichier";
}
