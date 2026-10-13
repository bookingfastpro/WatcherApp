"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../db";
import { audit } from "../audit";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { requirePermission } from "../auth/guards";
import { notifyAdmins } from "../email/mailer";
import { deleteQuietly, storage } from "../storage";
import { storeReportFiles, textEntries, UploadError, watchData } from "../reports";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { messageSchema, reportSchema, reportUpdateSchema, DOCUMENT_UPLOAD_KINDS } from "@/lib/validation/report";
import { MAX_DOCUMENTS_PER_REPORT, MAX_PHOTOS_PER_REPORT } from "@/lib/file-signature";
import { generatePublicRef } from "@/lib/public-ref";
import { ownerCanAddFiles, ownerCanDeleteFiles, ownerCanEditReport, ownerCanMarkRecovered } from "@/lib/permissions";
import { normalizeReference, normalizeSerial, normalizeText } from "@/lib/serial";

async function ownedReport(reportId: string, userId: string) {
  if (typeof reportId !== "string" || reportId.length > 40) return null;
  return db.theftReport.findFirst({
    where: { id: reportId, ownerId: userId },
    include: { watch: { include: { _count: { select: { images: true } } } }, _count: { select: { documents: true } } },
  });
}

// ───────────────────────────────────────────────────────── Création

export async function createReport(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:create");
  if (!(await rateLimit(`report:create:${user.id}`, 10, 86_400)).ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = reportSchema.safeParse(textEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error, "Certains champs de la déclaration sont à corriger.");
  const v = parsed.data;

  const photoCount = formData.getAll("photos").filter((f) => f instanceof File && f.size > 0).length;
  if (photoCount > MAX_PHOTOS_PER_REPORT) {
    return fail(`${MAX_PHOTOS_PER_REPORT} photos maximum.`, { photos: [`${MAX_PHOTOS_PER_REPORT} photos maximum.`] });
  }

  let files: Awaited<ReturnType<typeof storeReportFiles>>;
  try {
    files = await storeReportFiles(formData, {
      photos: "photos",
      documents: [
        { field: "policeReport", kind: "POLICE_REPORT" },
        { field: "invoice", kind: "PURCHASE_INVOICE" },
        { field: "otherDocuments", kind: "OTHER" },
      ],
    });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }
  if (files.documents.length > MAX_DOCUMENTS_PER_REPORT) {
    await deleteQuietly(files.keys);
    return fail(`${MAX_DOCUMENTS_PER_REPORT} documents maximum.`);
  }

  let reportId: string;
  try {
    const report = await db.$transaction(async (tx) => {
      const watch = await tx.watch.create({
        data: {
          ...watchData(v),
          images: {
            create: files.images.map((img, i) => ({
              storageKey: img.storageKey,
              mimeType: img.mimeType,
              sizeBytes: img.sizeBytes,
              width: img.width,
              height: img.height,
              position: i,
            })),
          },
        },
      });
      return tx.theftReport.create({
        data: {
          publicRef: generatePublicRef("SN"),
          ownerId: user.id,
          watchId: watch.id,
          theftDate: v.theftDate,
          theftCity: v.theftCity,
          theftCountry: v.theftCountry,
          circumstances: v.circumstances,
          privateDescription: v.privateDescription,
          policeReportFiled: v.policeReportFiled,
          policeReportNumber: v.policeReportFiled ? v.policeReportNumber : null,
          policeService: v.policeReportFiled ? v.policeService : null,
          ownerCertifiedAt: new Date(),
          documents: {
            create: files.documents.map((d) => ({
              kind: d.kind,
              storageKey: d.storageKey,
              mimeType: d.mimeType,
              sizeBytes: d.sizeBytes,
              sha256: d.sha256,
              originalName: d.originalName,
              uploadedById: user.id,
            })),
          },
          messages: {
            create: {
              kind: "SYSTEM",
              fromAdmin: true,
              body: "Votre déclaration a bien été enregistrée. Elle sera examinée par notre équipe de vérification ; vous serez notifié par email de toute évolution.",
            },
          },
        },
      });
    });
    reportId = report.id;
    await audit({
      category: "ACCOUNT",
      action: "report.created",
      actor: { id: user.id, role: user.role },
      targetType: "TheftReport",
      targetId: report.id,
      metadata: { publicRef: report.publicRef, photos: files.images.length, documents: files.documents.length },
    });
    await notifyAdmins("Nouvelle déclaration à vérifier", `Déclaration ${report.publicRef} — ${v.brand} ${v.model}.`);
  } catch (e) {
    await deleteQuietly(files.keys);
    throw e;
  }
  redirect(`/espace/declarations/${reportId}?nouvelle=1`);
}

// ───────────────────────────────────────────────────────── Modification

export async function updateReport(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:update-own");
  const report = await ownedReport(reportId, user.id);
  if (!report) return fail("Déclaration introuvable.");
  if (!ownerCanEditReport(report.status)) return fail("Cette déclaration ne peut plus être modifiée.");

  const parsed = reportUpdateSchema.safeParse(textEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.policeReportFiled && !v.policeReportNumber) {
    return fail("Indiquez la référence du dépôt de plainte.", {
      policeReportNumber: ["Indiquez le numéro ou la référence du dépôt de plainte."],
    });
  }

  // Modifier l'identification d'une montre vérifiée renvoie la déclaration en vérification.
  const w = report.watch;
  const identityChanged =
    normalizeText(w.brand) !== normalizeText(v.brand) ||
    normalizeText(w.model) !== normalizeText(v.model) ||
    (w.referenceNormalized ?? "") !== normalizeReference(v.reference) ||
    (w.serialNormalized ?? "") !== normalizeSerial(v.serialNumber);
  const backToPending = report.status === "VERIFIED" && identityChanged;

  await db.$transaction([
    db.watch.update({ where: { id: report.watchId }, data: watchData(v) }),
    db.theftReport.update({
      where: { id: report.id },
      data: {
        theftDate: v.theftDate,
        theftCity: v.theftCity,
        theftCountry: v.theftCountry,
        circumstances: v.circumstances ?? null,
        privateDescription: v.privateDescription ?? null,
        policeReportFiled: v.policeReportFiled,
        policeReportNumber: v.policeReportFiled ? v.policeReportNumber : null,
        policeService: v.policeReportFiled ? (v.policeService ?? null) : null,
        ...(backToPending ? { status: "PENDING" as const, verifiedAt: null, verifiedById: null } : {}),
        ...(report.status === "INFO_REQUESTED" ? { status: "PENDING" as const } : {}),
      },
    }),
    db.reportMessage.create({
      data: {
        theftReportId: report.id,
        authorId: user.id,
        kind: "SYSTEM",
        fromAdmin: false,
        body: backToPending
          ? "Les informations d'identification ont été modifiées : la déclaration repasse en vérification."
          : "La déclaration a été mise à jour par son auteur.",
      },
    }),
  ]);
  await audit({ category: "ACCOUNT", action: "report.updated", actor: { id: user.id, role: user.role }, targetType: "TheftReport", targetId: report.id, metadata: { backToPending } });
  redirect(`/espace/declarations/${report.id}?modifiee=1`);
}

// ───────────────────────────────────────────────────────── Pièces jointes

export async function addReportFiles(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:update-own");
  if (!(await rateLimit(`report:files:${user.id}`, 30, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);
  const report = await ownedReport(reportId, user.id);
  if (!report) return fail("Déclaration introuvable.");
  if (!ownerCanAddFiles(report.status)) return fail("Impossible d'ajouter des pièces à cette déclaration.");

  const kindRaw = String(formData.get("documentKind") ?? "OTHER");
  const kind = (DOCUMENT_UPLOAD_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as (typeof DOCUMENT_UPLOAD_KINDS)[number])
    : "OTHER";

  const newPhotos = formData.getAll("photos").filter((f) => f instanceof File && f.size > 0).length;
  const newDocs = formData.getAll("documents").filter((f) => f instanceof File && f.size > 0).length;
  if (newPhotos + newDocs === 0) return fail("Sélectionnez au moins un fichier.");
  if (report.watch._count.images + newPhotos > MAX_PHOTOS_PER_REPORT) {
    return fail(`Limite de ${MAX_PHOTOS_PER_REPORT} photos atteinte.`);
  }
  if (report._count.documents + newDocs > MAX_DOCUMENTS_PER_REPORT) {
    return fail(`Limite de ${MAX_DOCUMENTS_PER_REPORT} documents atteinte.`);
  }

  let files: Awaited<ReturnType<typeof storeReportFiles>>;
  try {
    files = await storeReportFiles(formData, { photos: "photos", documents: [{ field: "documents", kind }] });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }

  try {
    const start = report.watch._count.images;
    await db.$transaction([
      ...files.images.map((img, i) =>
        db.watchImage.create({
          data: {
            watchId: report.watchId,
            storageKey: img.storageKey,
            mimeType: img.mimeType,
            sizeBytes: img.sizeBytes,
            width: img.width,
            height: img.height,
            position: start + i,
          },
        }),
      ),
      ...files.documents.map((d) =>
        db.privateDocument.create({
          data: {
            kind: d.kind,
            storageKey: d.storageKey,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            sha256: d.sha256,
            originalName: d.originalName,
            theftReportId: report.id,
            uploadedById: user.id,
          },
        }),
      ),
      db.reportMessage.create({
        data: {
          theftReportId: report.id,
          authorId: user.id,
          kind: "SYSTEM",
          body: `${files.images.length + files.documents.length} pièce(s) ajoutée(s) par le déclarant.`,
        },
      }),
    ]);
  } catch (e) {
    await deleteQuietly(files.keys);
    throw e;
  }
  await audit({ category: "ACCOUNT", action: "report.files_added", actor: { id: user.id, role: user.role }, targetType: "TheftReport", targetId: report.id, metadata: { images: files.images.length, documents: files.documents.length } });
  revalidatePath(`/espace/declarations/${report.id}`);
  return ok("Pièces ajoutées.");
}

export async function deleteReportFile(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:update-own");
  const report = await ownedReport(reportId, user.id);
  if (!report) return fail("Déclaration introuvable.");
  if (!ownerCanDeleteFiles(report.status)) {
    return fail("Les pièces d'une déclaration vérifiée ne peuvent plus être supprimées. Contactez-nous via la messagerie.");
  }
  const fileId = String(formData.get("fileId") ?? "");
  const fileType = String(formData.get("fileType") ?? "");

  let key: string | null = null;
  if (fileType === "image") {
    const img = await db.watchImage.findFirst({ where: { id: fileId, watchId: report.watchId } });
    if (!img) return fail("Fichier introuvable.");
    await db.watchImage.delete({ where: { id: img.id } });
    key = img.storageKey;
  } else if (fileType === "document") {
    const doc = await db.privateDocument.findFirst({ where: { id: fileId, theftReportId: report.id } });
    if (!doc) return fail("Fichier introuvable.");
    await db.privateDocument.delete({ where: { id: doc.id } });
    key = doc.storageKey;
  } else {
    return fail("Requête invalide.");
  }
  await storage().delete(key).catch(() => undefined);
  await audit({ category: "ACCOUNT", action: "report.file_deleted", actor: { id: user.id, role: user.role }, targetType: "TheftReport", targetId: report.id, metadata: { fileType } });
  revalidatePath(`/espace/declarations/${report.id}`);
  return ok("Fichier supprimé.");
}

// ───────────────────────────────────────────────────────── Statut & messagerie

export async function markRecovered(reportId: string, _: ActionState, _formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:update-own");
  const report = await ownedReport(reportId, user.id);
  if (!report) return fail("Déclaration introuvable.");
  if (!ownerCanMarkRecovered(report.status)) return fail("Action impossible pour cette déclaration.");
  await db.$transaction([
    db.theftReport.update({ where: { id: report.id }, data: { status: "RECOVERED", recoveredAt: new Date() } }),
    db.reportMessage.create({
      data: { theftReportId: report.id, authorId: user.id, kind: "STATUS_CHANGE", body: "Le déclarant a indiqué avoir retrouvé sa montre." },
    }),
  ]);
  await audit({ category: "ACCOUNT", action: "report.marked_recovered", actor: { id: user.id, role: user.role }, targetType: "TheftReport", targetId: report.id });
  await notifyAdmins("Montre déclarée retrouvée", `La déclaration ${report.publicRef} a été marquée comme retrouvée par son auteur.`);
  revalidatePath(`/espace/declarations/${report.id}`);
  return ok("Nous sommes heureux que vous ayez retrouvé votre montre. La déclaration est mise à jour.");
}

export async function sendOwnerMessage(reportId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("report:read-own");
  if (!(await rateLimit(`report:msg:${user.id}`, 30, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);
  const report = await ownedReport(reportId, user.id);
  if (!report) return fail("Déclaration introuvable.");
  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return fromZodError(parsed.error);
  await db.reportMessage.create({
    data: { theftReportId: report.id, authorId: user.id, kind: "MESSAGE", fromAdmin: false, body: parsed.data.body },
  });
  await notifyAdmins("Nouveau message d'un déclarant", `Déclaration ${report.publicRef} : nouveau message du propriétaire.`);
  revalidatePath(`/espace/declarations/${report.id}`);
  return ok("Message envoyé à l'équipe de vérification.");
}
