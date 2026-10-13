import "server-only";
import type { AuditCategory, Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { getRequestMeta } from "./request";

export type AuditEntry = {
  category: AuditCategory;
  action: string;
  actor?: { id: string; role: Role } | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Journalise une action sensible. Ne lève jamais d'exception : un échec de journalisation
 * ne doit pas casser le parcours utilisateur, mais il est signalé dans les logs serveur.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    let meta: { ipHash: string | null; userAgent: string | null } = { ipHash: null, userAgent: null };
    try {
      meta = await getRequestMeta();
    } catch {
      // Hors contexte de requête (script, webhook…)
    }
    await db.auditLog.create({
      data: {
        category: entry.category,
        action: entry.action,
        actorId: entry.actor?.id ?? null,
        actorRole: entry.actor?.role ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? undefined,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] échec de journalisation", entry.action, error);
  }
}
