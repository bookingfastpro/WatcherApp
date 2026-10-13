import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Paramètres Argon2id recommandés par l'OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/** Égalise le temps de réponse lorsqu'un compte n'existe pas (anti-énumération). */
export async function dummyVerify(password: string): Promise<void> {
  dummyHash ??= hashPassword("timing-equalizer-not-a-real-password");
  await verifyPassword(await dummyHash, password);
}
