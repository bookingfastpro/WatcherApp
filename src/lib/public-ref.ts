/**
 * Identifiants publics des déclarations (ex. "SN-7K3M-9QX2").
 * Alphabet Crockford base32 (sans I, L, O, U) : lisible au téléphone, non séquentiel,
 * ne révèle ni le volume de la base ni l'ordre de création.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generatePublicRef(prefix = "SN", randomBytes?: Uint8Array): string {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[(bytes[i] ?? 0) % 32];
  }
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

export const PUBLIC_REF_PATTERN = /^(SN|DEMO)-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function isValidPublicRef(value: string): boolean {
  return PUBLIC_REF_PATTERN.test(value);
}
