import "server-only";
import type { Prisma, ReportStatus } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { getSettings } from "./settings";
import { rateLimit } from "./rate-limit";
import { notifyAdmins } from "./email/mailer";
import type { RequestMeta } from "./request";
import { MAX_RESULTS, evaluateSearchPolicy, type NormalizedCriteria, type SearchInput } from "@/lib/search-policy";
import { maskSerial } from "@/lib/serial";
import type { SessionUser } from "./auth/session";

/**
 * PROJECTION DE SÉCURITÉ.
 * Seuls ces champs peuvent quitter la base à destination d'un professionnel.
 * Aucune relation vers le propriétaire, les documents, les circonstances ou la plainte.
 */
export const SAFE_REPORT_SELECT = {
  id: true,
  publicRef: true,
  status: true,
  createdAt: true,
  verifiedAt: true,
  isDemo: true,
  watch: {
    select: {
      brand: true,
      model: true,
      reference: true,
      serialNumber: true,
      yearApprox: true,
      caseMaterial: true,
      caseSizeMm: true,
      dialColor: true,
      strap: true,
      distinctiveMarks: true,
      images: {
        where: { visibleToProfessionals: true, moderationStatus: { not: "REJECTED" } },
        select: { id: true },
        orderBy: { position: "asc" },
        take: 6,
      },
    },
  },
} satisfies Prisma.TheftReportSelect;

type SafeRow = Prisma.TheftReportGetPayload<{ select: typeof SAFE_REPORT_SELECT }>;

export type SafeMatch = {
  publicRef: string;
  status: ReportStatus;
  reportedAt: string; // ISO — affiché au mois près
  verified: boolean;
  isDemo: boolean;
  brand: string;
  model: string;
  reference: string | null;
  serial: string | null;
  serialMasked: boolean;
  yearApprox: number | null;
  caseMaterial: string | null;
  caseSizeMm: number | null;
  dialColor: string | null;
  strap: string | null;
  distinctiveMarks: string | null;
  imageIds: string[];
};

export function toSafeMatch(row: SafeRow, revealSerial: boolean): SafeMatch {
  return {
    publicRef: row.publicRef,
    status: row.status,
    reportedAt: row.createdAt.toISOString(),
    verified: row.status === "VERIFIED",
    isDemo: row.isDemo,
    brand: row.watch.brand,
    model: row.watch.model,
    reference: row.watch.reference,
    serial: revealSerial ? row.watch.serialNumber : maskSerial(row.watch.serialNumber),
    serialMasked: !revealSerial && Boolean(row.watch.serialNumber),
    yearApprox: row.watch.yearApprox,
    caseMaterial: row.watch.caseMaterial,
    caseSizeMm: row.watch.caseSizeMm,
    dialColor: row.watch.dialColor,
    strap: row.watch.strap,
    distinctiveMarks: row.watch.distinctiveMarks,
    imageIds: row.watch.images.map((i) => i.id),
  };
}

export async function visibleStatuses(forExactSerial: boolean): Promise<ReportStatus[]> {
  const settings = await getSettings();
  const statuses: ReportStatus[] = ["VERIFIED"];
  if (settings.includeUnverifiedReports) statuses.push("PENDING", "INFO_REQUESTED");
  // Une montre retrouvée reste signalée en recherche exacte, pour information.
  if (forExactSerial) statuses.push("RECOVERED");
  return statuses;
}

export type SearchOutcome =
  | { ok: true; results: SafeMatch[]; truncated: boolean; remainingToday: number; criteria: NormalizedCriteria }
  | { ok: false; error: string; code: "INVALID" | "RATE_LIMIT" | "QUOTA" };

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function logSearch(
  user: SessionUser,
  meta: RequestMeta,
  type: "SERIAL" | "ADVANCED",
  criteria: unknown,
  extra: Partial<Prisma.ProfessionalSearchUncheckedCreateInput>,
) {
  return db.professionalSearch.create({
    data: {
      userId: user.id,
      professionalProfileId: user.professionalProfile?.id ?? null,
      type,
      criteria: criteria as Prisma.InputJsonValue,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      ...extra,
    },
  });
}

/**
 * Recherche professionnelle. L'appelant DOIT avoir vérifié l'accès (requireProAccess ou équivalent API).
 */
export async function runProSearch(user: SessionUser, meta: RequestMeta, input: SearchInput): Promise<SearchOutcome> {
  const settings = await getSettings();
  const type = input.mode === "serial" ? "SERIAL" : "ADVANCED";
  const rawCriteria = { serial: input.serial, brand: input.brand, model: input.model, reference: input.reference };

  // 1. Limites de débit (par minute) et quota journalier.
  const perMinute = await rateLimit(`pro-search:min:${user.id}`, settings.searchPerMinute, 60);
  const perIp = await rateLimit(`pro-search:ip:${meta.ipHash}`, settings.searchPerMinute * 3, 60);
  if (!perMinute.ok || !perIp.ok) {
    await logSearch(user, meta, type, rawCriteria, { blocked: true, blockReason: "RATE_LIMIT" });
    return { ok: false, code: "RATE_LIMIT", error: "Trop de recherches en peu de temps. Patientez une minute." };
  }

  const today = await db.professionalSearch.count({
    where: { userId: user.id, blocked: false, createdAt: { gte: startOfUtcDay() } },
  });
  if (today >= settings.searchDailyQuota && user.role !== "ADMIN") {
    await logSearch(user, meta, type, rawCriteria, { blocked: true, blockReason: "QUOTA" });
    return {
      ok: false,
      code: "QUOTA",
      error: `Quota journalier atteint (${settings.searchDailyQuota} recherches). Contactez-nous si votre activité le nécessite.`,
    };
  }

  // 2. Politique anti-extraction (critères discriminants).
  const policy = evaluateSearchPolicy(input);
  if (!policy.ok) {
    await logSearch(user, meta, type, rawCriteria, { blocked: true, blockReason: "INVALID" });
    return { ok: false, code: "INVALID", error: policy.error };
  }
  const criteria = policy.criteria;

  // 3. Requête avec projection de sécurité.
  const exactSerial = criteria.type === "SERIAL";
  const statuses = await visibleStatuses(exactSerial);
  const watch: Prisma.WatchWhereInput = {};
  if (criteria.type === "SERIAL") {
    watch.serialNormalized = criteria.serial;
  } else {
    if (criteria.brand) watch.brandNormalized = { startsWith: criteria.brand };
    if (criteria.model) watch.modelNormalized = { contains: criteria.model };
    if (criteria.reference) watch.referenceNormalized = { startsWith: criteria.reference };
    if (criteria.serial) watch.serialNormalized = criteria.serial;
  }

  const rows = await db.theftReport.findMany({
    where: { status: { in: statuses }, watch },
    select: SAFE_REPORT_SELECT,
    orderBy: { createdAt: "desc" },
    take: MAX_RESULTS + 1,
  });
  const truncated = rows.length > MAX_RESULTS;
  const kept = rows.slice(0, MAX_RESULTS);

  const revealSerial =
    criteria.type === "SERIAL" || Boolean(criteria.serial) || settings.serialDisplayPolicy === "FULL";
  const results = kept.map((r) => toSafeMatch(r, revealSerial));

  // 4. Journalisation + détection de comportement anormal.
  const hourAgo = new Date(Date.now() - 3600 * 1000);
  const lastHour = await db.professionalSearch.count({ where: { userId: user.id, createdAt: { gte: hourAgo } } });
  const flagged = lastHour + 1 > settings.anomalyHourlyThreshold;

  await logSearch(user, meta, type, criteria, {
    serialNormalized: criteria.serial ?? null,
    resultCount: results.length,
    matchedReportIds: kept.map((r) => r.id),
    flagged,
  });

  if (flagged) {
    const alreadyFlagged = await db.auditLog.count({
      where: { action: "pro.search_anomaly", actorId: user.id, createdAt: { gte: hourAgo } },
    });
    if (alreadyFlagged === 0) {
      await audit({
        category: "SECURITY",
        action: "pro.search_anomaly",
        actor: { id: user.id, role: user.role },
        targetType: "User",
        targetId: user.id,
        metadata: { searchesLastHour: lastHour + 1, threshold: settings.anomalyHourlyThreshold },
      });
      await notifyAdmins(
        "Volume de recherche anormal",
        `Le compte ${user.email} a effectué ${lastHour + 1} recherches au cours de la dernière heure (seuil : ${settings.anomalyHourlyThreshold}).`,
      );
    }
  }

  return {
    ok: true,
    results,
    truncated,
    remainingToday: Math.max(0, settings.searchDailyQuota - today - 1),
    criteria,
  };
}

/**
 * Un professionnel ne peut ouvrir la fiche d'une déclaration que s'il l'a obtenue
 * via une recherche récente (24 h) ou l'a mise en favori — pas d'accès par énumération d'identifiants.
 */
export async function proCanViewReport(user: SessionUser, reportId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [search, bookmark] = await Promise.all([
    db.professionalSearch.findFirst({
      where: { userId: user.id, matchedReportIds: { has: reportId }, createdAt: { gte: since } },
      select: { id: true },
    }),
    db.bookmark.findUnique({ where: { userId_theftReportId: { userId: user.id, theftReportId: reportId } }, select: { id: true } }),
  ]);
  return Boolean(search || bookmark);
}
