import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

let driver: StorageDriver | null = null;

/**
 * Stockage privé des fichiers. Aucun fichier n'est jamais servi directement :
 * tout passe par /api/files/* qui vérifie les autorisations à chaque requête.
 */
export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  driver = e.STORAGE_DRIVER === "s3" ? new S3Storage(e) : new LocalStorage(e.STORAGE_LOCAL_DIR);
  return driver;
}

export type StoragePrefix = "images" | "documents" | "partners";

export function newStorageKey(prefix: StoragePrefix, ext: "webp" | "pdf" | "jpg" | "png"): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${prefix}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
}

/** Suppression "best effort" (ex. nettoyage après une transaction échouée). */
export async function deleteQuietly(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => storage().delete(k).catch((e) => console.error("[storage] delete", k, e))));
}
