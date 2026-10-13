import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./index";

const KEY_PATTERN = /^(images|documents|partners)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(webp|pdf|jpg|png)$/;

/** Stockage disque. En production, monter un volume persistant sur STORAGE_LOCAL_DIR. */
export class LocalStorage implements StorageDriver {
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(dir);
  }

  private resolve(key: string): string {
    // Les clés sont générées par le serveur ; on vérifie malgré tout (défense en profondeur).
    if (!KEY_PATTERN.test(key)) throw new Error("Clé de stockage invalide");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Chemin de stockage invalide");
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, { mode: 0o600 });
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
