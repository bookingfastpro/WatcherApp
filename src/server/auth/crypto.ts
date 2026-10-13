import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Les jetons (session, email) ne sont stockés que sous forme de hash SHA-256. */
export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
