import "server-only";
import type { DocumentKind } from "@prisma/client";
import { normalizeReference, normalizeSerial, normalizeText } from "@/lib/serial";
import type { z } from "zod";
import type { watchFieldsSchema } from "@/lib/validation/report";
import { filesFrom, processDocument, processImage, UploadError, type ProcessedFile } from "./uploads";
import { newStorageKey, storage, deleteQuietly } from "./storage";

type WatchFields = z.infer<typeof watchFieldsSchema>;

/** Données Watch dérivées d'une saisie validée (avec colonnes normalisées pour la recherche). */
export function watchData(v: WatchFields) {
  return {
    brand: v.brand,
    brandNormalized: normalizeText(v.brand),
    model: v.model,
    modelNormalized: normalizeText(v.model),
    reference: v.reference ?? null,
    referenceNormalized: normalizeReference(v.reference) || null,
    serialNumber: v.serialNumber ?? null,
    serialNormalized: normalizeSerial(v.serialNumber) || null,
    yearApprox: v.yearApprox ?? null,
    caseMaterial: v.caseMaterial ?? null,
    caseSizeMm: v.caseSizeMm ?? null,
    dialColor: v.dialColor ?? null,
    strap: v.strap ?? null,
    distinctiveMarks: v.distinctiveMarks ?? null,
  };
}

/** Uniquement les champs texte d'un FormData (les fichiers sont traités à part). */
export function textEntries(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export type StoredImage = ProcessedFile & { storageKey: string };
export type StoredDocument = ProcessedFile & { storageKey: string; kind: DocumentKind };

/**
 * Valide, ré-encode puis stocke les fichiers d'un formulaire.
 * En cas d'erreur, les fichiers déjà stockés sont supprimés.
 */
export async function storeReportFiles(
  formData: FormData,
  spec: { photos: string; documents: { field: string; kind: DocumentKind }[] },
): Promise<{ images: StoredImage[]; documents: StoredDocument[]; keys: string[] }> {
  const photoFiles = filesFrom(formData, spec.photos);
  const docFiles = spec.documents.flatMap((d) => filesFrom(formData, d.field).map((file) => ({ file, kind: d.kind })));

  const images = await Promise.all(photoFiles.map((f) => processImage(f)));
  const docs = await Promise.all(docFiles.map(async (d) => ({ ...(await processDocument(d.file)), kind: d.kind })));

  const keys: string[] = [];
  try {
    const storedImages: StoredImage[] = [];
    for (const img of images) {
      const key = newStorageKey("images", "webp");
      await storage().put(key, img.buffer, img.mimeType);
      keys.push(key);
      storedImages.push({ ...img, storageKey: key });
    }
    const storedDocs: StoredDocument[] = [];
    for (const doc of docs) {
      const key = newStorageKey("documents", doc.ext);
      await storage().put(key, doc.buffer, doc.mimeType);
      keys.push(key);
      storedDocs.push({ ...doc, storageKey: key });
    }
    return { images: storedImages, documents: storedDocs, keys };
  } catch (e) {
    await deleteQuietly(keys);
    throw e;
  }
}

export { UploadError };
