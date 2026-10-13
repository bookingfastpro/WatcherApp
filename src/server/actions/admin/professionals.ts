"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { audit } from "../../audit";
import { requireAdmin } from "../../auth/guards";
import { sendMail } from "../../email/mailer";
import { professionalDecisionEmail } from "../../email/templates";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { manualSubscriptionSchema, proDecisionSchema } from "@/lib/validation/admin";
import { PRO_STATUS_LABEL } from "@/lib/labels";

const path = (id: string) => `/admin/professionnels/${id}`;

export async function decideProfessional(profileId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = proDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { decision, note } = parsed.data;
  if ((decision === "REJECTED" || decision === "SUSPENDED") && !note) {
    return fail("Un motif est requis.", { note: ["Indiquez le motif (communiqué au professionnel en cas de refus)."] });
  }
  const profile = await db.professionalProfile.findUnique({ where: { id: profileId }, include: { user: true } });
  if (!profile) return fail("Profil introuvable.");

  await db.professionalProfile.update({
    where: { id: profileId },
    data: { verificationStatus: decision, reviewNote: note ?? null, reviewedAt: new Date(), reviewedById: admin.id },
  });
  await audit({
    category: "ADMIN",
    action: "professional.decision",
    actor: { id: admin.id, role: admin.role },
    targetType: "ProfessionalProfile",
    targetId: profileId,
    metadata: { from: profile.verificationStatus, to: decision },
  });
  if ((decision === "APPROVED" || decision === "REJECTED") && profile.user.status === "ACTIVE") {
    await sendMail(professionalDecisionEmail(profile.user.email, decision === "APPROVED", note));
  }
  revalidatePath(path(profileId));
  revalidatePath("/admin/validations");
  return ok(`Statut : ${PRO_STATUS_LABEL[decision]}.`);
}

/** Accès accordé manuellement (partenaire, période d'essai, test) — sans paiement Stripe. */
export async function grantManualSubscription(profileId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = manualSubscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.endsAt <= new Date()) return fail("La date de fin doit être dans le futur.", { endsAt: ["Date passée."] });
  const profile = await db.professionalProfile.findUnique({ where: { id: profileId } });
  if (!profile) return fail("Profil introuvable.");
  const sub = await db.subscription.create({
    data: {
      professionalProfileId: profileId,
      planId: parsed.data.planId ?? null,
      source: "MANUAL",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: parsed.data.endsAt,
      note: parsed.data.note,
    },
  });
  await audit({ category: "BILLING", action: "subscription.manual_granted", actor: { id: admin.id, role: admin.role }, targetType: "ProfessionalProfile", targetId: profileId, metadata: { subscriptionId: sub.id, endsAt: parsed.data.endsAt.toISOString() } });
  revalidatePath(path(profileId));
  return ok("Accès manuel accordé.");
}

export async function revokeManualSubscription(subscriptionId: string, _: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.source !== "MANUAL") return fail("Seuls les accès manuels peuvent être révoqués ici (utilisez Stripe pour les autres).");
  await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", canceledAt: new Date(), currentPeriodEnd: new Date() } });
  await audit({ category: "BILLING", action: "subscription.manual_revoked", actor: { id: admin.id, role: admin.role }, targetType: "Subscription", targetId: sub.id });
  revalidatePath(path(sub.professionalProfileId));
  return ok("Accès manuel révoqué.");
}
