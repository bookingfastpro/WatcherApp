import { z } from "zod";
import "./zod-fr";

/**
 * Paramètres de la plateforme, modifiables depuis /admin/parametres.
 * Stockés en base (AppSetting, clé "platform") et fusionnés avec ces valeurs par défaut.
 */
export const settingsSchema = z.object({
  /** Délai de grâce après échéance / impayé avant blocage de l'accès pro (jours). */
  graceDays: z.coerce.number().int().min(0).max(60).default(7),
  /** Nombre maximum de recherches par professionnel et par jour. */
  searchDailyQuota: z.coerce.number().int().min(1).max(5000).default(200),
  /** Nombre maximum de recherches par professionnel et par minute. */
  searchPerMinute: z.coerce.number().int().min(1).max(120).default(15),
  /** Seuil horaire au-delà duquel les recherches sont marquées comme anormales. */
  anomalyHourlyThreshold: z.coerce.number().int().min(5).max(5000).default(60),
  /** Inclure les déclarations non encore vérifiées dans les résultats (signalées comme telles). */
  includeUnverifiedReports: z.coerce.boolean().default(true),
  /** Affichage du numéro de série dans la recherche avancée (la recherche par n° exact l'affiche toujours). */
  serialDisplayPolicy: z.enum(["FULL", "MASKED_IN_ADVANCED"]).default("MASKED_IN_ADVANCED"),
  /** Conservation de l'historique des recherches (jours). */
  searchLogRetentionDays: z.coerce.number().int().min(30).max(3650).default(365),
  /** Conservation du journal d'audit (jours). */
  auditLogRetentionDays: z.coerce.number().int().min(180).max(3650).default(1095),
  /** Publication des statistiques sur la page d'accueil (données réelles uniquement). */
  publicStatsEnabled: z.coerce.boolean().default(false),
  /** Volume minimal de déclarations vérifiées avant publication des statistiques. */
  publicStatsMinimum: z.coerce.number().int().min(0).max(1_000_000).default(50),
  /** Adresse de contact affichée publiquement. */
  contactEmail: z.string().email().or(z.literal("")).default(""),
});

export type PlatformSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: PlatformSettings = settingsSchema.parse({});

export function parseSettings(raw: unknown): PlatformSettings {
  const base = typeof raw === "object" && raw !== null ? raw : {};
  const parsed = settingsSchema.safeParse(base);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
