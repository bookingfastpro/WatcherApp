/**
 * Matrice des permissions par rôle (vérifiée côté serveur dans chaque action / route).
 * Les permissions "contextuelles" (propriété d'une déclaration, abonnement actif, match récent)
 * sont vérifiées en plus, au plus près des données.
 */
export type Role = "INDIVIDUAL" | "PROFESSIONAL" | "ADMIN";

export const PERMISSIONS = {
  "report:create": ["INDIVIDUAL", "PROFESSIONAL", "ADMIN"],
  "report:read-own": ["INDIVIDUAL", "PROFESSIONAL", "ADMIN"],
  "report:update-own": ["INDIVIDUAL", "PROFESSIONAL", "ADMIN"],
  "account:export": ["INDIVIDUAL", "PROFESSIONAL", "ADMIN"],
  "pro:search": ["PROFESSIONAL", "ADMIN"],
  "pro:match-report": ["PROFESSIONAL"],
  "pro:billing": ["PROFESSIONAL"],
  "admin:access": ["ADMIN"],
  "admin:reports": ["ADMIN"],
  "admin:users": ["ADMIN"],
  "admin:professionals": ["ADMIN"],
  "admin:partners": ["ADMIN"],
  "admin:billing": ["ADMIN"],
  "admin:audit": ["ADMIN"],
  "admin:settings": ["ADMIN"],
  "document:read-any": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Statuts de déclaration modifiables par le propriétaire. */
export function ownerCanEditReport(status: string): boolean {
  return status === "PENDING" || status === "INFO_REQUESTED" || status === "VERIFIED";
}

/** Le propriétaire peut ajouter des pièces tant que la déclaration est "vivante". */
export function ownerCanAddFiles(status: string): boolean {
  return status === "PENDING" || status === "INFO_REQUESTED" || status === "VERIFIED";
}

/** Un document ne peut être supprimé par son auteur qu'avant vérification. */
export function ownerCanDeleteFiles(status: string): boolean {
  return status === "PENDING" || status === "INFO_REQUESTED";
}

export function ownerCanMarkRecovered(status: string): boolean {
  return status === "PENDING" || status === "INFO_REQUESTED" || status === "VERIFIED";
}
