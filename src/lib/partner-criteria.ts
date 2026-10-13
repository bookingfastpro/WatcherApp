/**
 * Critères de vérification des partenaires.
 * Le badge "Partenaire vérifié" dépend EXCLUSIVEMENT de ces critères,
 * jamais du niveau de partenariat ou d'une mise en avant commerciale.
 */
export const PARTNER_CRITERIA = [
  { key: "identityChecked", label: "Identité du dirigeant vérifiée", required: true },
  { key: "registrationChecked", label: "Immatriculation (Kbis / registre) vérifiée", required: true },
  { key: "premisesChecked", label: "Existence d'un établissement ou d'une activité réelle constatée", required: true },
  { key: "charterSigned", label: "Charte de bonnes pratiques signée", required: true },
  { key: "referencesChecked", label: "Références professionnelles contrôlées", required: false },
] as const;

export type PartnerCriteriaKey = (typeof PARTNER_CRITERIA)[number]["key"];
export type PartnerCriteria = Partial<Record<PartnerCriteriaKey, boolean>>;

export function parsePartnerCriteria(raw: unknown): PartnerCriteria {
  const out: PartnerCriteria = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const c of PARTNER_CRITERIA) {
    const v = (raw as Record<string, unknown>)[c.key];
    if (v === true) out[c.key] = true;
  }
  return out;
}

export function meetsVerificationCriteria(criteria: PartnerCriteria): boolean {
  return PARTNER_CRITERIA.filter((c) => c.required).every((c) => criteria[c.key] === true);
}
