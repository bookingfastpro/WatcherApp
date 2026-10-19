import "server-only";
import { z } from "zod";

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = z.preprocess(blankToUndefined, z.string().optional());
const bool = (def: boolean) =>
  z.preprocess(
    (v) => (blankToUndefined(v) === undefined ? def : String(v).toLowerCase() === "true" || v === "1"),
    z.boolean(),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.preprocess(blankToUndefined, z.url().default("http://localhost:3000")),
    APP_SECRET: z.string().min(32, "APP_SECRET doit contenir au moins 32 caractères."),
    TRUST_PROXY: bool(true),
    // Désactive TEMPORAIREMENT la limite de tentatives de connexion et le verrouillage du compte (15 min).
    DISABLE_LOGIN_LOCKOUT: bool(false),
    DATABASE_URL: z.string().min(1),

    STORAGE_DRIVER: z.preprocess(blankToUndefined, z.enum(["local", "s3"]).default("local")),
    STORAGE_LOCAL_DIR: z.preprocess(blankToUndefined, z.string().default("./storage")),
    S3_ENDPOINT: optional,
    S3_REGION: z.preprocess(blankToUndefined, z.string().default("us-east-1")),
    S3_BUCKET: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_FORCE_PATH_STYLE: bool(true),

    SMTP_HOST: optional,
    SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().default(587)),
    SMTP_SECURE: bool(false),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    EMAIL_FROM: z.preprocess(blankToUndefined, z.string().default("Watcher <no-reply@localhost>")),
    ADMIN_NOTIFICATION_EMAIL: optional,

    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,

    CRON_SECRET: optional,
  })
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER === "s3") {
      for (const k of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} est requis avec STORAGE_DRIVER=s3` });
      }
    }
    if (v.NODE_ENV === "production" && v.APP_SECRET.startsWith("change-me")) {
      ctx.addIssue({ code: "custom", path: ["APP_SECRET"], message: "APP_SECRET doit être changé en production." });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Lecture paresseuse et validée des variables d'environnement (échoue explicitement si invalide). */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";
export const stripeEnabled = () => Boolean(env().STRIPE_SECRET_KEY);
export const appUrl = (path = "") => `${env().APP_URL.replace(/\/$/, "")}${path}`;
