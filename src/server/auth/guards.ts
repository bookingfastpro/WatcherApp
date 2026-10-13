import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "../db";
import { getSettings } from "../settings";
import { getSession, type SessionUser } from "./session";
import { evaluateProAccess, type ProAccess } from "@/lib/access";
import { can, type Permission } from "@/lib/permissions";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  return session?.user ?? null;
});

/** Page ou action nécessitant un utilisateur connecté (et email vérifié). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (!user.emailVerifiedAt) redirect("/connexion?unverified=1");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) notFound();
  return user;
}

/** Les routes admin renvoient 404 aux non-admins (on ne révèle pas leur existence). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

export type ProContext = {
  user: SessionUser;
  profileId: string | null;
  access: ProAccess;
};

/** Calcule l'accès professionnel (profil validé + abonnement actif, délai de grâce inclus). */
export const getProContext = cache(async (): Promise<ProContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const settings = await getSettings();
  const profile = user.professionalProfile;
  const subscriptions = profile
    ? await db.subscription.findMany({
        where: { professionalProfileId: profile.id },
        select: { status: true, currentPeriodEnd: true },
      })
    : [];
  const access = evaluateProAccess({
    role: user.role,
    userStatus: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    verificationStatus: profile?.verificationStatus ?? null,
    subscriptions,
    graceDays: settings.graceDays,
  });
  return { user, profileId: profile?.id ?? null, access };
});

/** Espace pro : réservé aux comptes professionnels (et administrateurs). */
export async function requireProArea(): Promise<ProContext> {
  const user = await requireUser();
  if (user.role !== "PROFESSIONAL" && user.role !== "ADMIN") redirect("/espace");
  const ctx = await getProContext();
  if (!ctx) redirect("/connexion");
  return ctx;
}

/** Fonctions de la base pro : exigent un accès effectif (validation + abonnement). */
export async function requireProAccess(): Promise<ProContext & { access: { allowed: true } }> {
  const ctx = await requireProArea();
  if (!ctx.access.allowed) redirect("/pro");
  return ctx as ProContext & { access: { allowed: true } };
}
