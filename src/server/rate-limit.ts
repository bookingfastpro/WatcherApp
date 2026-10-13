import "server-only";
import { db } from "./db";

export type RateLimitResult = { ok: boolean; count: number; limit: number; resetAt: Date };

export function windowStartFor(now: number, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now / ms) * ms);
}

/**
 * Limiteur à fenêtre fixe stocké dans PostgreSQL : partagé entre toutes les instances,
 * sans dépendance supplémentaire (Redis). Incrément atomique via INSERT … ON CONFLICT.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = windowStartFor(now, windowSeconds);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_buckets" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "rate_limit_buckets"."count" + 1
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? 1);

  // Nettoyage opportuniste des fenêtres expirées (≈1 % des appels).
  if (Math.random() < 0.01) {
    void db.rateLimitBucket
      .deleteMany({ where: { windowStart: { lt: new Date(now - 2 * 24 * 3600 * 1000) } } })
      .catch(() => undefined);
  }

  return { ok: count <= limit, count, limit, resetAt: new Date(windowStart.getTime() + windowSeconds * 1000) };
}

export const RATE_LIMIT_MESSAGE = "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.";
