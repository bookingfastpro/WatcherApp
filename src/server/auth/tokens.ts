import "server-only";
import type { TokenType } from "@prisma/client";
import { db } from "../db";
import { randomToken, sha256 } from "./crypto";

const TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 48 * 3600 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Crée un jeton à usage unique ; les jetons précédents du même type sont invalidés. */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const token = randomToken(32);
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.authToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return token;
}

/** Consomme un jeton. Retourne l'identifiant utilisateur, ou null si invalide/expiré/déjà utilisé. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  // updateMany conditionnel : empêche une double consommation concurrente.
  const r = await db.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1 ? row.userId : null;
}
