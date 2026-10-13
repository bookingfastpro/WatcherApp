import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";

const DAY = 24 * 3600 * 1000;

/** Purge des données arrivées en fin de durée de conservation (minimisation RGPD). */
export async function runMaintenance() {
  const settings = await getSettings();
  const now = Date.now();
  const [sessions, tokens, buckets, searches, audits, events] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now - DAY) } }, { usedAt: { lt: new Date(now - 7 * DAY) } }] } }),
    db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(now - 2 * DAY) } } }),
    db.professionalSearch.deleteMany({ where: { createdAt: { lt: new Date(now - settings.searchLogRetentionDays * DAY) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: new Date(now - settings.auditLogRetentionDays * DAY) } } }),
    db.stripeEvent.deleteMany({ where: { processedAt: { lt: new Date(now - 90 * DAY) } } }),
  ]);
  return {
    sessions: sessions.count,
    tokens: tokens.count,
    rateLimitBuckets: buckets.count,
    searches: searches.count,
    auditLogs: audits.count,
    stripeEvents: events.count,
  };
}
