"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "../../db";
import { audit } from "../../audit";
import { requireAdmin } from "../../auth/guards";
import { saveSettings } from "../../settings";
import { runMaintenance } from "../../maintenance";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { matchStatusSchema, planSchema } from "@/lib/validation/admin";
import { settingsSchema } from "@/lib/settings-schema";
import { textEntries } from "../../reports";

// ───────────────────────────────────────────────────────── Offres

export async function savePlan(planId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = planSchema.safeParse(textEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { priceEuros, ...v } = parsed.data;
  const data = { ...v, stripePriceId: v.stripePriceId ?? null, priceCents: priceEuros ?? null };
  try {
    const plan = planId ? await db.plan.update({ where: { id: planId }, data }) : await db.plan.create({ data });
    await audit({ category: "BILLING", action: planId ? "plan.updated" : "plan.created", actor: { id: admin.id, role: admin.role }, targetType: "Plan", targetId: plan.id, metadata: { stripePriceId: data.stripePriceId, priceCents: data.priceCents } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Code ou identifiant de prix Stripe déjà utilisé.");
    }
    throw e;
  }
  revalidatePath("/admin/abonnements");
  revalidatePath("/professionnels");
  return ok("Offre enregistrée.");
}

// ───────────────────────────────────────────────────────── Signalements de possession

export async function updateMatchReport(matchId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = matchStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const match = await db.potentialMatchReport.findUnique({ where: { id: matchId } });
  if (!match) return fail("Signalement introuvable.");
  await db.potentialMatchReport.update({
    where: { id: matchId },
    data: { status: parsed.data.status, adminNotes: parsed.data.adminNotes ?? null, handledById: admin.id, handledAt: new Date() },
  });
  await audit({ category: "ADMIN", action: "match.updated", actor: { id: admin.id, role: admin.role }, targetType: "PotentialMatchReport", targetId: matchId, metadata: { from: match.status, to: parsed.data.status } });
  revalidatePath(`/admin/signalements/${matchId}`);
  revalidatePath("/admin/signalements");
  return ok("Signalement mis à jour.");
}

// ───────────────────────────────────────────────────────── Paramètres

export async function updateSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const raw = textEntries(formData);
  // Les cases non cochées sont absentes du FormData : conversion explicite en booléens.
  const parsed = settingsSchema.safeParse({
    ...raw,
    includeUnverifiedReports: raw.includeUnverifiedReports === "on",
    publicStatsEnabled: raw.publicStatsEnabled === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error);
  await saveSettings(parsed.data, admin.id);
  await audit({ category: "ADMIN", action: "settings.updated", actor: { id: admin.id, role: admin.role }, metadata: parsed.data });
  revalidatePath("/admin/parametres");
  return ok("Paramètres enregistrés.");
}

export async function runMaintenanceNow(_: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const result = await runMaintenance();
  await audit({ category: "ADMIN", action: "system.maintenance", actor: { id: admin.id, role: admin.role }, metadata: result });
  return ok(`Purge effectuée : ${result.sessions} session(s), ${result.searches} recherche(s), ${result.auditLogs} entrée(s) d'audit expirées.`);
}
