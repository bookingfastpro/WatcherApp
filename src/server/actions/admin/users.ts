"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { audit } from "../../audit";
import { requireAdmin } from "../../auth/guards";
import { revokeAllSessions } from "../../auth/session";
import { issueToken } from "../../auth/tokens";
import { sendMail } from "../../email/mailer";
import { verificationEmail } from "../../email/templates";
import { anonymizeUser } from "../../gdpr";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { suspendSchema } from "@/lib/validation/admin";

const path = (id: string) => `/admin/utilisateurs/${id}`;

async function target(userId: string, adminId: string) {
  if (userId === adminId) return { error: "Vous ne pouvez pas effectuer cette action sur votre propre compte." } as const;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Utilisateur introuvable." } as const;
  return { user } as const;
}

export async function suspendUser(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const t = await target(userId, admin.id);
  if ("error" in t) return fail(t.error ?? "Erreur.");
  const parsed = suspendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (t.user.status === "DELETED") return fail("Ce compte est supprimé.");

  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED", suspendedReason: parsed.data.reason } });
  const sessions = await revokeAllSessions(userId);
  await audit({
    category: "ADMIN",
    action: "user.suspended",
    actor: { id: admin.id, role: admin.role },
    targetType: "User",
    targetId: userId,
    metadata: { reason: parsed.data.reason, revokedSessions: sessions },
  });
  revalidatePath(path(userId));
  return ok("Compte suspendu et sessions révoquées.");
}

export async function reactivateUser(userId: string, _: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const t = await target(userId, admin.id);
  if ("error" in t) return fail(t.error ?? "Erreur.");
  if (t.user.status !== "SUSPENDED") return fail("Ce compte n'est pas suspendu.");
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", suspendedReason: null, failedLoginCount: 0, lockedUntil: null } });
  await audit({ category: "ADMIN", action: "user.reactivated", actor: { id: admin.id, role: admin.role }, targetType: "User", targetId: userId });
  revalidatePath(path(userId));
  return ok("Compte réactivé.");
}

export async function revokeUserSessions(userId: string, _: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const t = await target(userId, admin.id);
  if ("error" in t) return fail(t.error ?? "Erreur.");
  const count = await revokeAllSessions(userId);
  await audit({ category: "ADMIN", action: "user.sessions_revoked", actor: { id: admin.id, role: admin.role }, targetType: "User", targetId: userId, metadata: { count } });
  revalidatePath(path(userId));
  return ok(`${count} session(s) révoquée(s).`);
}

export async function adminResendVerification(userId: string, _: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt || user.status !== "ACTIVE") return fail("Envoi impossible pour ce compte.");
  const token = await issueToken(user.id, "EMAIL_VERIFICATION");
  await sendMail(verificationEmail(user.email, token));
  await audit({ category: "ADMIN", action: "user.verification_resent", actor: { id: admin.id, role: admin.role }, targetType: "User", targetId: userId });
  return ok("Email de vérification renvoyé.");
}

/** Traite une demande de suppression (RGPD) : anonymisation du compte. */
export async function processDeletion(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const t = await target(userId, admin.id);
  if ("error" in t) return fail(t.error ?? "Erreur.");
  if (t.user.status === "DELETED") return fail("Compte déjà supprimé.");
  if (t.user.role === "ADMIN") return fail("Retirez d'abord les droits administrateur de ce compte.");

  const result = await anonymizeUser(userId);
  await db.dataRequest.updateMany({
    where: { userId, type: "DELETION", status: "PENDING" },
    data: { status: "COMPLETED", processedAt: new Date(), processedById: admin.id, note: String(formData.get("note") ?? "") || undefined },
  });
  await audit({ category: "ADMIN", action: "gdpr.user_anonymized", actor: { id: admin.id, role: admin.role }, targetType: "User", targetId: userId, metadata: result });
  revalidatePath(path(userId));
  revalidatePath("/admin/rgpd");
  return ok(`Compte anonymisé (${result.deletedReports} déclaration(s) supprimée(s), ${result.keptReports} conservée(s) sans données personnelles).`);
}

export async function rejectDataRequest(requestId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 5) return fail("Motif requis (il sera conservé et doit pouvoir être communiqué à la personne).", { note: ["Motif requis."] });
  const r = await db.dataRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date(), processedById: admin.id, note },
  });
  if (r.count === 0) return fail("Demande introuvable ou déjà traitée.");
  await audit({ category: "ADMIN", action: "gdpr.request_rejected", actor: { id: admin.id, role: admin.role }, targetType: "DataRequest", targetId: requestId });
  revalidatePath("/admin/rgpd");
  return ok("Demande clôturée.");
}
