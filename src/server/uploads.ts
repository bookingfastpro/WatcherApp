import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  sanitizeFileName,
  sniffFileType,
} from "@/lib/file-signature";

export class UploadError extends Error {}

export type ProcessedFile = {
  buffer: Buffer;
  mimeType: string;
  ext: "webp" | "pdf";
  sizeBytes: number;
  sha256: string;
  originalName: string;
  width?: number;
  height?: number;
};

/** Récupère les fichiers réellement envoyés (les champs file vides ont une taille 0). */
export function filesFrom(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((v): v is File => typeof v === "object" && v !== null && "arrayBuffer" in v && (v as File).size > 0);
}

async function reencodeImage(input: Buffer): Promise<{ buffer: Buffer; width?: number; height?: number }> {
  // Ré-encodage systématique : supprime les métadonnées EXIF (dont la géolocalisation GPS),
  // neutralise les fichiers polyglottes et normalise la taille.
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

export async function processImage(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError(`« ${sanitizeFileName(file.name)} » dépasse 10 Mo.`);
  const input = Buffer.from(await file.arrayBuffer());
  const type = sniffFileType(input.subarray(0, 16));
  if (!type || !IMAGE_TYPES.includes(type)) {
    throw new UploadError(`« ${sanitizeFileName(file.name)} » n'est pas une image JPEG, PNG ou WebP valide.`);
  }
  try {
    const out = await reencodeImage(input);
    return {
      buffer: out.buffer,
      mimeType: "image/webp",
      ext: "webp",
      sizeBytes: out.buffer.length,
      sha256: createHash("sha256").update(out.buffer).digest("hex"),
      originalName: sanitizeFileName(file.name),
      width: out.width,
      height: out.height,
    };
  } catch {
    throw new UploadError(`« ${sanitizeFileName(file.name)} » est illisible ou corrompu.`);
  }
}

export async function processDocument(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new UploadError(`« ${sanitizeFileName(file.name)} » dépasse 15 Mo.`);
  const input = Buffer.from(await file.arrayBuffer());
  const type = sniffFileType(input.subarray(0, 16));
  if (!type || !DOCUMENT_TYPES.includes(type)) {
    throw new UploadError(`« ${sanitizeFileName(file.name)} » : formats acceptés PDF, JPEG, PNG, WebP.`);
  }
  if (type === "application/pdf") {
    return {
      buffer: input,
      mimeType: "application/pdf",
      ext: "pdf",
      sizeBytes: input.length,
      sha256: createHash("sha256").update(input).digest("hex"),
      originalName: sanitizeFileName(file.name),
    };
  }
  const img = await processImage(file);
  return img;
}
