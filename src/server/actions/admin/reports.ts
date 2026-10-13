"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { audit } from "../../audit";
import { requireAdmin } from "../../auth/guards";
import { sendMail } from "../../email/mailer";
import { reportUpdateEmail } from "../../email/templates";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { adminNotesSchema, reportStatusSchema } from "@/lib/validation/admin";
import { messageSchema } from "@/lib/validation/report";
import { REPORT_STATUS_LABEL } from "@/lib/labels";

const path = (id: string) => `/admin/declarations/${id}`;

export async function setReportStatus(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = reportStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { status, reason, notifyOwner } = parsed.data;
  if ((status === "REJECTED" || status === "INFO_REQUESTED") && !reason) {
    return fail("Un motif est requis pour ce statut.", { reason: ["Précisez le motif ou les informations attendues."] });
  }

  const report = await db.theftReport.findUnique({ where: { id: reportId }, include: { owner: { select: { email: true, status: true } } } });
  if (!report) return fail("Déclaration introuvable.");
  if (report.status === status) return fail("La déclaration a déjà ce statut.");

  const label = REPORT_STATUS_LABEL[status] ?? status;
  await db.$transaction([
    db.theftReport.update({
      where: { id: report.id },
      data: {
        status,
        statusReason: reason ?? null,
        ...(status === "VERIFIED" ? { verifiedAt: new Date(), verifiedById: admin.id } : {}),
        ...(status === "RECOVERED" ? { recoveredAt: new Date() } : {}),
      },
    }),
    db.reportMessage.create({
      data: {
        theftReportId: report.id,
        authorId: admin.id,
        fromAdmin: true,
        kind: status === "INFO_REQUESTED" ? "INFO_REQUEST" : "STATUS_CHANGE",
        body: reason ? `Statut : ${label}.\n${reason}` : `Statut : ${label}.`,
      },
    }),
  ]);

  await audit({
    category: "ADMIN",
    action: "report.status_changed",
    actor: { id: admin.id, role: admin.role },
    targetType: "TheftReport",
    targetId: report.id,
    metadata: { from: report.status, to: status },
  });
  if (notifyOwner && report.owner.status === "ACTIVE") {
    await sendMail(reportUpdateEmail(report.owner.email, report.publicRef, report.id, label, reason));
  }
  revalidatePath(path(report.id));
  return ok(`Statut mis à jour : ${label}.`);
}

export async function sendAdminMessage(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return fromZodError(parsed.error);
  const report = await db.theftReport.findUnique({ where: { id: reportId }, include: { owner: { select: { email: true, status: true } } } });
  if (!report) return fail("Déclaration introuvable.");

  await db.reportMessage.create({
    data: { theftReportId: report.id, authorId: admin.id, fromAdmin: true, kind: "MESSAGE", body: parsed.data.body },
  });
  // Marque les messages du déclarant comme lus.
  await db.reportMessage.updateMany({ where: { theftReportId: report.id, fromAdmin: false, readAt: null }, data: { readAt: new Date() } });
  await audit({ category: "ADMIN", action: "report.message_sent", actor: { id: admin.id, role: admin.role }, targetType: "TheftReport", targetId: report.id });
  if (report.owner.status === "ACTIVE") {
    await sendMail(reportUpdateEmail(report.owner.email, report.publicRef, report.id, "Nouveau message de l'équipe de vérification", parsed.data.body));
  }
  revalidatePath(path(report.id));
  return ok("Message envoyé au déclarant.");
}

export async function saveAdminNotes(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = adminNotesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  await db.theftReport.update({ where: { id: reportId }, data: { adminNotes: parsed.data.adminNotes ?? null } });
  await audit({ category: "ADMIN", action: "report.notes_updated", actor: { id: admin.id, role: admin.role }, targetType: "TheftReport", targetId: reportId });
  revalidatePath(path(reportId));
  return ok("Notes internes enregistrées.");
}

export async function moderateImage(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const imageId = String(formData.get("imageId") ?? "");
  const op = String(formData.get("op") ?? "");
  const report = await db.theftReport.findUnique({ where: { id: reportId }, select: { watchId: true } });
  if (!report) return fail("Déclaration introuvable.");
  const image = await db.watchImage.findFirst({ where: { id: imageId, watchId: report.watchId } });
  if (!image) return fail("Image introuvable.");

  const data =
    op === "approve"
      ? { moderationStatus: "APPROVED" as const }
      : op === "reject"
        ? { moderationStatus: "REJECTED" as const }
        : op === "toggle"
          ? { visibleToProfessionals: !image.visibleToProfessionals }
          : null;
  if (!data) return fail("Opération inconnue.");
  await db.watchImage.update({ where: { id: image.id }, data });
  await audit({ category: "ADMIN", action: `image.${op}`, actor: { id: admin.id, role: admin.role }, targetType: "WatchImage", targetId: image.id });
  revalidatePath(path(reportId));
  return ok("Image mise à jour.");
}

export async function moderateDocument(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const documentId = String(formData.get("documentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING") return fail("Statut invalide.");
  const doc = await db.privateDocument.findUnique({ where: { id: documentId } });
  if (!doc) return fail("Document introuvable.");
  await db.privateDocument.update({ where: { id: doc.id }, data: { moderationStatus: status } });
  await audit({ category: "ADMIN", action: "document.moderated", actor: { id: admin.id, role: admin.role }, targetType: "PrivateDocument", targetId: doc.id, metadata: { status } });
  if (doc.theftReportId) revalidatePath(path(doc.theftReportId));
  if (doc.professionalProfileId) revalidatePath(`/admin/professionnels/${doc.professionalProfileId}`);
  return ok("Document mis à jour.");
}
