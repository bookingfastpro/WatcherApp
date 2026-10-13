import { z } from "zod";
import "../zod-fr";
import { COUNTRY_CODES } from "../countries";

const COMMON_PASSWORDS = new Set([
  "motdepasse123", "password1234", "azertyuiop12", "123456789012", "qwertyuiop12",
  "watcher123", "motdepasse1234", "password12345", "000000000000", "azerty123456",
]);

export const emailSchema = z
  .string({ error: "Adresse email requise." })
  .trim()
  .toLowerCase()
  .max(254, "Adresse email trop longue.")
  .pipe(z.email({ error: "Adresse email invalide." }));

export const passwordSchema = z
  .string({ error: "Mot de passe requis." })
  .min(12, "12 caractères minimum.")
  .max(128, "128 caractères maximum.")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Utilisez au moins une lettre et un chiffre.")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "Ce mot de passe est trop courant.");

const name = (label: string) =>
  z.string().trim().min(1, `${label} requis.`).max(80, `${label} trop long.`);

const checkbox = (message: string) =>
  z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).refine((v) => v, message);

const optionalCheckbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(128),
  next: z.string().optional(),
});

export const registerIndividualSchema = z.object({
  firstName: name("Prénom"),
  lastName: name("Nom"),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: checkbox("Vous devez accepter les conditions d'utilisation."),
  acceptPrivacy: checkbox("Vous devez prendre connaissance de la politique de confidentialité."),
  marketingConsent: optionalCheckbox,
});

export const companySchema = z.object({
  companyName: z.string().trim().min(2, "Nom commercial requis.").max(120),
  legalName: optionalText(160),
  registrationNumber: z
    .string()
    .trim()
    .min(5, "Numéro d'immatriculation requis (SIRET, n° RCS ou équivalent).")
    .max(40),
  vatNumber: optionalText(30),
  activity: z.enum(
    ["WATCHMAKER", "JEWELER", "DEALER", "AUCTION_HOUSE", "PRE_OWNED_MARKET", "EXPERT", "INSURER", "OTHER"],
    { error: "Sélectionnez une activité." },
  ),
  activityOther: optionalText(120),
  addressLine: z.string().trim().min(3, "Adresse requise.").max(200),
  postalCode: z.string().trim().min(2, "Code postal requis.").max(12),
  city: z.string().trim().min(1, "Ville requise.").max(100),
  country: z.enum(COUNTRY_CODES as [string, ...string[]], { error: "Pays invalide." }),
  phone: z
    .string()
    .trim()
    .min(6, "Téléphone requis.")
    .max(30)
    .regex(/^[+0-9 ().-]+$/, "Numéro de téléphone invalide."),
  website: optionalText(200).refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "L'URL doit commencer par https://"),
});

export const registerProfessionalSchema = registerIndividualSchema.extend(companySchema.shape);

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

export const profileSchema = z.object({
  firstName: name("Prénom"),
  lastName: name("Nom"),
  phone: optionalText(30).refine((v) => !v || /^[+0-9 ().-]+$/.test(v), "Numéro de téléphone invalide."),
  marketingConsent: optionalCheckbox,
});
