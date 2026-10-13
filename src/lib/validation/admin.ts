import { z } from "zod";
import "../zod-fr";
import { COUNTRY_CODES } from "../countries";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalUrl = optionalText(300).refine(
  (v) => !v || /^https:\/\/[^\s]+$/i.test(v),
  "L'URL doit commencer par https://",
);

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const reportStatusSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "INFO_REQUESTED", "REJECTED", "RECOVERED"]),
  reason: optionalText(2000),
  notifyOwner: checkbox,
});

export const adminNotesSchema = z.object({ adminNotes: optionalText(5000) });

export const proDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "PENDING"]),
  note: optionalText(2000),
});

export const suspendSchema = z.object({
  reason: z.string().trim().min(3, "Motif requis.").max(1000),
});

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Nom requis.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Uniquement lettres minuscules, chiffres et tirets."),
  city: z.string().trim().min(1, "Ville requise.").max(100),
  country: z.enum(COUNTRY_CODES as [string, ...string[]]),
  specialties: z
    .string()
    .trim()
    .max(300)
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  shortDescription: z.string().trim().min(10, "Présentation courte requise.").max(280),
  description: optionalText(5000),
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  linkedin: optionalUrl,
  isPublished: checkbox,
  tier: z.enum(["STANDARD", "PREMIUM"]),
  isSponsored: checkbox,
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  verificationNotes: optionalText(3000),
  wantVerified: checkbox,
});

export const planSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "Identifiant technique : minuscules, chiffres, - et _"),
  name: z.string().trim().min(2).max(80),
  description: optionalText(500),
  interval: z.enum(["MONTH", "YEAR"]),
  stripePriceId: optionalText(120).refine((v) => !v || v.startsWith("price_"), "Un ID de prix Stripe commence par price_"),
  priceEuros: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Math.round(Number.parseFloat(v.replace(",", ".")) * 100) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v < 100_000_000), "Prix invalide."),
  features: z
    .string()
    .trim()
    .max(2000)
    .transform((v) =>
      v
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  isActive: checkbox,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const manualSubscriptionSchema = z.object({
  planId: optionalText(40),
  endsAt: z
    .string()
    .min(1, "Date de fin requise.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
    .transform((v) => new Date(`${v.slice(0, 10)}T23:59:59.000Z`)),
  note: optionalText(500),
});

export const matchStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "OWNER_NOTIFIED", "TRANSMITTED_TO_AUTHORITIES", "CLOSED"]),
  adminNotes: optionalText(5000),
});
