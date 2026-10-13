"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { audit } from "../audit";
import { getRequestMeta } from "../request";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { dummyVerify, hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroyCurrentSession, getSession, revokeAllSessions } from "../auth/session";
import { consumeToken, issueToken } from "../auth/tokens";
import { notifyAdmins, sendMail } from "../email/mailer";
import { passwordResetEmail, verificationEmail } from "../email/templates";
import { newStorageKey, storage, deleteQuietly } from "../storage";
import { filesFrom, processDocument, UploadError } from "../uploads";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import {
  forgotPasswordSchema,
  loginSchema,
  registerIndividualSchema,
  registerProfessionalSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { safeNextPath } from "@/lib/session-cookie";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function homeFor(role: string) {
  return role === "ADMIN" ? "/admin" : role === "PROFESSIONAL" ? "/pro" : "/espace";
}

const GENERIC_REGISTER_OK =
  "Compte créé. Un email de confirmation vient de vous être envoyé : cliquez sur le lien pour activer votre compte.";

// ───────────────────────────────────────────────────────── Inscription particulier

export async function registerIndividual(_: ActionState, formData: FormData): Promise<ActionState> {
  const meta = await getRequestMeta();
  if (!(await rateLimit(`register:ip:${meta.ipHash}`, 10, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = registerIndividualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const existing = await db.user.findUnique({ where: { email: v.email }, select: { id: true } });
  if (existing) {
    // Anti-énumération : même réponse que pour un nouveau compte.
    return ok(GENERIC_REGISTER_OK, { registered: true });
  }

  const now = new Date();
  const user = await db.user.create({
    data: {
      email: v.email,
      passwordHash: await hashPassword(v.password),
      role: "INDIVIDUAL",
      firstName: v.firstName,
      lastName: v.lastName,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      marketingConsent: v.marketingConsent,
    },
  });
  const token = await issueToken(user.id, "EMAIL_VERIFICATION");
  await sendMail(verificationEmail(user.email, token));
  await audit({ category: "ACCOUNT", action: "account.registered", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });
  return ok(GENERIC_REGISTER_OK, { registered: true });
}

// ───────────────────────────────────────────────────────── Inscription professionnel

export async function registerProfessional(_: ActionState, formData: FormData): Promise<ActionState> {
  const meta = await getRequestMeta();
  if (!(await rateLimit(`register:ip:${meta.ipHash}`, 10, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = registerProfessionalSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const existing = await db.user.findUnique({ where: { email: v.email }, select: { id: true } });
  if (existing) return ok(GENERIC_REGISTER_OK, { registered: true });

  // Justificatif d'immatriculation (facultatif à l'inscription, peut être demandé ensuite).
  const files = filesFrom(formData, "registrationDocument").slice(0, 1);
  let doc: Awaited<ReturnType<typeof processDocument>> | null = null;
  try {
    if (files[0]) doc = await processDocument(files[0]);
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message, { registrationDocument: [e.message] });
    throw e;
  }
  const key = doc ? newStorageKey("documents", doc.ext) : null;
  if (doc && key) await storage().put(key, doc.buffer, doc.mimeType);

  const now = new Date();
  try {
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: v.email,
          passwordHash: await hashPassword(v.password),
          role: "PROFESSIONAL",
          firstName: v.firstName,
          lastName: v.lastName,
          phone: v.phone,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          marketingConsent: v.marketingConsent,
        },
      });
      const profile = await tx.professionalProfile.create({
        data: {
          userId: u.id,
          companyName: v.companyName,
          legalName: v.legalName,
          registrationNumber: v.registrationNumber,
          vatNumber: v.vatNumber,
          activity: v.activity,
          activityOther: v.activityOther,
          addressLine: v.addressLine,
          postalCode: v.postalCode,
          city: v.city,
          country: v.country,
          phone: v.phone,
          website: v.website,
        },
      });
      if (doc && key) {
        await tx.privateDocument.create({
          data: {
            kind: "BUSINESS_REGISTRATION",
            storageKey: key,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            sha256: doc.sha256,
            originalName: doc.originalName,
            professionalProfileId: profile.id,
            uploadedById: u.id,
          },
        });
      }
      return u;
    });
    const token = await issueToken(user.id, "EMAIL_VERIFICATION");
    await sendMail(verificationEmail(user.email, token));
    await audit({ category: "ACCOUNT", action: "account.registered_professional", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });
    await notifyAdmins("Nouveau compte professionnel à valider", `${v.companyName} (${v.email}) a demandé un accès professionnel.`);
  } catch (e) {
    if (key) await deleteQuietly([key]);
    throw e;
  }
  return ok(GENERIC_REGISTER_OK, { registered: true });
}

// ───────────────────────────────────────────────────────── Connexion

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error, "Identifiants invalides.");
  const { email, password } = parsed.data;
  const meta = await getRequestMeta();

  const [ipLimit, emailLimit] = await Promise.all([
    rateLimit(`login:ip:${meta.ipHash}`, 30, 900),
    rateLimit(`login:email:${email}`, 10, 900),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) return fail(RATE_LIMIT_MESSAGE);

  const GENERIC = "Email ou mot de passe incorrect.";
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status === "DELETED") {
    await dummyVerify(password);
    return fail(GENERIC);
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await dummyVerify(password);
    return fail(`${GENERIC} Après plusieurs échecs, le compte est temporairement verrouillé ${LOCK_MINUTES} minutes.`);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : undefined,
      },
    });
    await audit({
      category: "SECURITY",
      action: lock ? "auth.account_locked" : "auth.login_failed",
      targetType: "User",
      targetId: user.id,
    });
    return fail(GENERIC);
  }

  if (user.status === "SUSPENDED") {
    return fail("Ce compte est suspendu. Contactez l'équipe de la plateforme pour plus d'informations.");
  }
  if (!user.emailVerifiedAt) {
    return fail("Votre adresse email n'est pas encore confirmée.", undefined, { unverified: true, email });
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id, user.role);
  await audit({ category: "SECURITY", action: "auth.login", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });

  const next = safeNextPath(parsed.data.next, "");
  const allowedNext =
    next && (user.role === "ADMIN" || !next.startsWith("/admin")) && (user.role !== "INDIVIDUAL" || !next.startsWith("/pro"));
  redirect(allowedNext ? next : homeFor(user.role));
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    await audit({ category: "SECURITY", action: "auth.logout", actor: { id: session.user.id, role: session.user.role } });
  }
  await destroyCurrentSession();
  redirect("/");
}

// ───────────────────────────────────────────────────────── Vérification email

export async function verifyEmail(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const userId = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!userId) return fail("Ce lien est invalide ou a expiré. Demandez un nouvel email de confirmation.");
  const user = await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await audit({ category: "ACCOUNT", action: "account.email_verified", actor: { id: user.id, role: user.role }, targetType: "User", targetId: user.id });
  await createSession(user.id, user.role);
  redirect(`${homeFor(user.role)}?bienvenue=1`);
}

export async function resendVerification(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const meta = await getRequestMeta();
  if (!(await rateLimit(`verify-resend:${meta.ipHash}`, 5, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);
  if (!(await rateLimit(`verify-resend:email:${parsed.data.email}`, 3, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.emailVerifiedAt && user.status === "ACTIVE") {
    const token = await issueToken(user.id, "EMAIL_VERIFICATION");
    await sendMail(verificationEmail(user.email, token));
  }
  return ok("Si un compte non confirmé correspond à cette adresse, un nouvel email vient d'être envoyé.");
}

// ───────────────────────────────────────────────────────── Mot de passe oublié

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const meta = await getRequestMeta();
  if (!(await rateLimit(`reset:ip:${meta.ipHash}`, 10, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);
  if (!(await rateLimit(`reset:email:${parsed.data.email}`, 3, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && user.status === "ACTIVE") {
    const token = await issueToken(user.id, "PASSWORD_RESET");
    await sendMail(passwordResetEmail(user.email, token));
    await audit({ category: "SECURITY", action: "auth.password_reset_requested", targetType: "User", targetId: user.id });
  }
  return ok("Si un compte correspond à cette adresse, vous allez recevoir un lien de réinitialisation.", { sent: true });
}

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return fail("Ce lien est invalide ou a expiré. Faites une nouvelle demande.");

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      failedLoginCount: 0,
      lockedUntil: null,
      // Recevoir le lien prouve la possession de la boîte mail.
      emailVerifiedAt: new Date(),
    },
  });
  // Toutes les sessions existantes sont révoquées.
  await revokeAllSessions(userId);
  await audit({ category: "SECURITY", action: "auth.password_reset", targetType: "User", targetId: userId });
  redirect("/connexion?reinitialise=1");
}
