"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { audit } from "../audit";
import { requireUser } from "../auth/guards";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, revokeAllSessions } from "../auth/session";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { notifyAdmins } from "../email/mailer";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { changePasswordSchema, profileSchema } from "@/lib/validation/auth";

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  await db.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone ?? null,
      marketingConsent: parsed.data.marketingConsent,
    },
  });
  await audit({ category: "ACCOUNT", action: "account.profile_updated", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });
  revalidatePath("/", "layout");
  return ok("Profil mis à jour.");
}

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`pwd-change:${user.id}`, 5, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const full = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(full.passwordHash, parsed.data.currentPassword))) {
    await audit({ category: "SECURITY", action: "account.password_change_failed", actor: { id: user.id, role: user.role } });
    return fail("Mot de passe actuel incorrect.", { currentPassword: ["Mot de passe actuel incorrect."] });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Déconnecte les autres appareils, puis recrée une session pour l'appareil courant.
  await revokeAllSessions(user.id);
  await createSession(user.id, user.role);
  await audit({ category: "SECURITY", action: "account.password_changed", actor: { id: user.id, role: user.role } });
  return ok("Mot de passe modifié. Vos autres sessions ont été déconnectées.");
}

export async function requestAccountDeletion(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const pending = await db.dataRequest.findFirst({ where: { userId: user.id, type: "DELETION", status: "PENDING" } });
  if (pending) return fail("Une demande de suppression est déjà en cours de traitement.");
  const note = String(formData.get("note") ?? "").slice(0, 1000) || null;
  await db.dataRequest.create({ data: { userId: user.id, type: "DELETION", note } });
  await audit({ category: "ACCOUNT", action: "gdpr.deletion_requested", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });
  await notifyAdmins("Demande de suppression de compte (RGPD)", `L'utilisateur ${user.email} demande la suppression de son compte.`);
  revalidatePath("/espace/parametres");
  return ok("Votre demande a été transmise. Elle sera traitée dans un délai maximal d'un mois.");
}
