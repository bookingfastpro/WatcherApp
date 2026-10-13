"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { audit } from "../audit";
import { getRequestMeta } from "../request";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { requireProAccess, requireProArea } from "../auth/guards";
import { proCanViewReport, runProSearch, type SafeMatch } from "../search";
import { notifyAdmins } from "../email/mailer";
import { storeReportFiles, UploadError } from "../reports";
import { deleteQuietly } from "../storage";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { searchInputSchema } from "@/lib/search-policy";
import { bookmarkNoteSchema, companyContactSchema, matchReportSchema } from "@/lib/validation/pro";
import { isValidPublicRef } from "@/lib/public-ref";

export type SearchState = {
  status: "idle" | "success" | "error";
  error?: string;
  results?: SafeMatch[];
  truncated?: boolean;
  remainingToday?: number;
  mode?: "serial" | "advanced";
  query?: string;
  at?: number;
};

/** Recherche depuis le tableau de bord pro (mêmes contrôles que l'API /api/pro/search). */
export async function searchAction(_: SearchState, formData: FormData): Promise<SearchState> {
  const { user } = await requireProAccess();
  const parsed = searchInputSchema.safeParse({
    mode: formData.get("mode") === "advanced" ? "advanced" : "serial",
    serial: formData.get("serial") ?? undefined,
    brand: formData.get("brand") ?? undefined,
    model: formData.get("model") ?? undefined,
    reference: formData.get("reference") ?? undefined,
  });
  if (!parsed.success) return { status: "error", error: "Recherche invalide.", at: Date.now() };

  const outcome = await runProSearch(user, await getRequestMeta(), parsed.data);
  const query = [parsed.data.brand, parsed.data.model, parsed.data.reference, parsed.data.serial].filter(Boolean).join(" · ");
  if (!outcome.ok) return { status: "error", error: outcome.error, mode: parsed.data.mode, at: Date.now() };
  return {
    status: "success",
    results: outcome.results,
    truncated: outcome.truncated,
    remainingToday: outcome.remainingToday,
    mode: parsed.data.mode,
    query,
    at: Date.now(),
  };
}

async function reportForPro(publicRef: string) {
  if (!isValidPublicRef(publicRef)) return null;
  return db.theftReport.findUnique({ where: { publicRef }, select: { id: true, publicRef: true } });
}

export async function toggleBookmark(publicRef: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProAccess();
  const report = await reportForPro(publicRef);
  if (!report || !(await proCanViewReport(user, report.id))) return fail("Déclaration introuvable.");

  const existing = await db.bookmark.findUnique({
    where: { userId_theftReportId: { userId: user.id, theftReportId: report.id } },
  });
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    revalidatePath(`/pro/declarations/${publicRef}`);
    revalidatePath("/pro/favoris");
    return ok("Retiré de vos dossiers suivis.");
  }
  const parsed = bookmarkNoteSchema.safeParse({ note: formData.get("note") ?? undefined });
  const count = await db.bookmark.count({ where: { userId: user.id } });
  if (count >= 200) return fail("Nombre maximal de dossiers suivis atteint (200).");
  await db.bookmark.create({
    data: { userId: user.id, theftReportId: report.id, note: parsed.success ? parsed.data.note : undefined },
  });
  revalidatePath(`/pro/declarations/${publicRef}`);
  revalidatePath("/pro/favoris");
  return ok("Ajouté à vos dossiers suivis.");
}

/**
 * Signalement d'une possession potentielle. Transmis aux administrateurs uniquement :
 * le professionnel n'obtient jamais les coordonnées du propriétaire.
 */
export async function submitMatchReport(publicRef: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProAccess();
  if (!(await rateLimit(`match-report:${user.id}`, 10, 86_400)).ok) return fail(RATE_LIMIT_MESSAGE);
  const report = await reportForPro(publicRef);
  if (!report || !(await proCanViewReport(user, report.id))) return fail("Déclaration introuvable.");

  const parsed = matchReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const match = await db.potentialMatchReport.create({
    data: {
      theftReportId: report.id,
      reporterId: user.id,
      professionalProfileId: user.professionalProfile?.id ?? null,
      context: v.context,
      observedSerial: v.observedSerial,
      location: v.location,
      message: v.message,
    },
  });
  await audit({
    category: "ACCESS",
    action: "pro.match_reported",
    actor: { id: user.id, role: user.role },
    targetType: "TheftReport",
    targetId: report.id,
    metadata: { matchReportId: match.id },
  });
  await notifyAdmins(
    "Signalement de possession potentielle",
    `${user.professionalProfile?.companyName ?? user.email} signale être potentiellement en possession de la montre ${report.publicRef}.`,
  );
  revalidatePath("/pro/signalements");
  return ok("Signalement transmis. Notre équipe va l'examiner et reviendra vers vous. Conservez la montre si la situation le permet.");
}

export async function uploadBusinessDocument(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProArea();
  const profile = user.professionalProfile;
  if (!profile) return fail("Profil professionnel introuvable.");
  if (!(await rateLimit(`pro-doc:${user.id}`, 10, 86_400)).ok) return fail(RATE_LIMIT_MESSAGE);
  const existing = await db.privateDocument.count({ where: { professionalProfileId: profile.id } });
  if (existing >= 10) return fail("Nombre maximal de documents atteint. Contactez-nous.");

  let stored: Awaited<ReturnType<typeof storeReportFiles>>;
  try {
    stored = await storeReportFiles(formData, { photos: "__none__", documents: [{ field: "document", kind: "BUSINESS_REGISTRATION" }] });
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message);
    throw e;
  }
  const doc = stored.documents[0];
  if (!doc) return fail("Sélectionnez un fichier.");
  try {
    await db.privateDocument.create({
      data: {
        kind: doc.kind,
        storageKey: doc.storageKey,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        sha256: doc.sha256,
        originalName: doc.originalName,
        professionalProfileId: profile.id,
        uploadedById: user.id,
      },
    });
  } catch (e) {
    await deleteQuietly(stored.keys);
    throw e;
  }
  await audit({ category: "ACCOUNT", action: "pro.document_uploaded", actor: { id: user.id, role: user.role }, targetType: "ProfessionalProfile", targetId: profile.id });
  await notifyAdmins("Nouveau justificatif professionnel", `${profile.companyName} a transmis un justificatif d'immatriculation.`);
  revalidatePath("/pro/entreprise");
  return ok("Document transmis à l'équipe de vérification.");
}

export async function updateCompanyContact(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProArea();
  if (!user.professionalProfile) return fail("Profil professionnel introuvable.");
  const parsed = companyContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  await db.professionalProfile.update({
    where: { id: user.professionalProfile.id },
    data: { ...parsed.data, website: parsed.data.website ?? null },
  });
  await audit({ category: "ACCOUNT", action: "pro.profile_updated", actor: { id: user.id, role: user.role }, targetType: "ProfessionalProfile", targetId: user.professionalProfile.id });
  revalidatePath("/pro/entreprise");
  return ok("Coordonnées mises à jour.");
}
