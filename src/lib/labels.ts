/** Libellés français des énumérations (source unique pour l'UI et les emails). */

export const REPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente de vérification",
  VERIFIED: "Vérifiée",
  INFO_REQUESTED: "Informations demandées",
  REJECTED: "Refusée",
  RECOVERED: "Montre retrouvée",
};

export const REPORT_STATUS_TONE: Record<string, "neutral" | "ok" | "warn" | "alert" | "muted"> = {
  PENDING: "neutral",
  VERIFIED: "ok",
  INFO_REQUESTED: "warn",
  REJECTED: "alert",
  RECOVERED: "muted",
};

export const PRO_STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente de validation",
  APPROVED: "Validé",
  REJECTED: "Refusé",
  SUSPENDED: "Suspendu",
};

export const PRO_STATUS_TONE: Record<string, "neutral" | "ok" | "warn" | "alert" | "muted"> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "alert",
  SUSPENDED: "alert",
};

export const ACTIVITY_LABEL: Record<string, string> = {
  WATCHMAKER: "Horloger",
  JEWELER: "Bijoutier",
  DEALER: "Revendeur de montres",
  AUCTION_HOUSE: "Maison de ventes",
  PRE_OWNED_MARKET: "Marché de l'occasion",
  EXPERT: "Expert",
  INSURER: "Assureur",
  OTHER: "Autre",
};

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  POLICE_REPORT: "Dépôt de plainte",
  PURCHASE_INVOICE: "Facture / preuve d'achat",
  OWNERSHIP_PROOF: "Justificatif de propriété",
  BUSINESS_REGISTRATION: "Justificatif d'immatriculation",
  OTHER: "Autre document",
};

export const MODERATION_LABEL: Record<string, string> = {
  PENDING: "À modérer",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

export const ROLE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Particulier",
  PROFESSIONAL: "Professionnel",
  ADMIN: "Administrateur",
};

export const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DELETED: "Supprimé",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  TRIALING: "Période d'essai",
  PAST_DUE: "Paiement en retard",
  UNPAID: "Impayé",
  CANCELED: "Résilié",
  INCOMPLETE: "Incomplet",
  INCOMPLETE_EXPIRED: "Expiré",
  PAUSED: "En pause",
};

export const INTERVAL_LABEL: Record<string, string> = {
  MONTH: "mois",
  YEAR: "an",
};

export const MATCH_CONTEXT_LABEL: Record<string, string> = {
  PURCHASE_OFFER: "Proposition d'achat",
  TRADE_IN: "Reprise",
  REPAIR: "Réparation / entretien",
  APPRAISAL: "Expertise / estimation",
  CONSIGNMENT: "Dépôt-vente",
  OTHER: "Autre",
};

export const MATCH_STATUS_LABEL: Record<string, string> = {
  OPEN: "Nouveau",
  IN_REVIEW: "En cours d'analyse",
  OWNER_NOTIFIED: "Propriétaire informé",
  TRANSMITTED_TO_AUTHORITIES: "Transmis aux autorités",
  CLOSED: "Clôturé",
};

export const AUDIT_CATEGORY_LABEL: Record<string, string> = {
  ADMIN: "Administration",
  SECURITY: "Sécurité",
  ACCESS: "Accès sensible",
  BILLING: "Facturation",
  ACCOUNT: "Compte",
};

export const PARTNER_TIER_LABEL: Record<string, string> = {
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
