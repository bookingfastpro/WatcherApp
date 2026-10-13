// Accès minimal au stockage pour les scripts Node (seed). Même convention de clés que src/server/storage.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function newKey(prefix, ext) {
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
}

export async function putObject(key, body, contentType) {
  if ((process.env.STORAGE_DRIVER ?? "local") === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    });
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const root = path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage");
  const full = path.join(root, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body, { mode: 0o600 });
}
