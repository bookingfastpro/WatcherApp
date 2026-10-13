import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "../db";
import { getRequestMeta } from "../request";
import { randomToken, sha256 } from "./crypto";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const HOUR = 3600 * 1000;
/** Sessions administrateur plus courtes (surface d'attaque plus sensible). */
const TTL: Record<Role, number> = { ADMIN: 12 * HOUR, PROFESSIONAL: 7 * 24 * HOUR, INDIVIDUAL: 14 * 24 * HOUR };

export async function createSession(userId: string, role: Role): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + TTL[role]);
  const meta = await getRequestMeta();
  await db.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, ipHash: meta.ipHash, userAgent: meta.userAgent },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

const sessionUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  firstName: true,
  lastName: true,
  isDemo: true,
  professionalProfile: {
    select: {
      id: true,
      companyName: true,
      verificationStatus: true,
      stripeCustomerId: true,
    },
  },
} as const;

/** Session courante (mise en cache pour la durée de la requête). */
export const getSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, expiresAt: true, user: { select: sessionUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;
  return session;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const r = await db.session.deleteMany({ where: { userId } });
  return r.count;
}
