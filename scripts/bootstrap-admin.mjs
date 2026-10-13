// Crée (ou promeut) un compte administrateur.
//
//   node scripts/bootstrap-admin.mjs <email> <motDePasse>
//   ou via INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD (exécuté au démarrage du conteneur :
//   ne fait rien si un administrateur existe déjà).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

try {
  process.loadEnvFile();
} catch {
  /* pas de fichier .env (conteneur) */
}

const [, , argEmail, argPassword] = process.argv;
const fromCli = Boolean(argEmail);
const email = (argEmail ?? process.env.INITIAL_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = argPassword ?? process.env.INITIAL_ADMIN_PASSWORD ?? "";

if (!email) {
  if (fromCli) console.error("Usage : node scripts/bootstrap-admin.mjs <email> <motDePasse>");
  process.exit(fromCli ? 1 : 0);
}

const db = new PrismaClient();
try {
  if (!fromCli) {
    const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (admins > 0) {
      console.info("[bootstrap-admin] un administrateur existe déjà — rien à faire.");
      process.exit(0);
    }
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN", status: "ACTIVE", emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } });
    console.info(`[bootstrap-admin] ${email} promu administrateur.`);
  } else {
    if (password.length < 12) {
      console.error("[bootstrap-admin] mot de passe trop court (12 caractères minimum).");
      process.exit(1);
    }
    const now = new Date();
    await db.user.create({
      data: {
        email,
        passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 }),
        role: "ADMIN",
        emailVerifiedAt: now,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        firstName: "Admin",
      },
    });
    console.info(`[bootstrap-admin] administrateur ${email} créé.`);
  }
  await db.auditLog.create({ data: { category: "ADMIN", action: "system.admin_bootstrapped", metadata: { email } } });
} finally {
  await db.$disconnect();
}
