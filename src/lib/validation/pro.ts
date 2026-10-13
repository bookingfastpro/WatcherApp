import { z } from "zod";
import "../zod-fr";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const matchReportSchema = z.object({
  context: z.enum(["PURCHASE_OFFER", "TRADE_IN", "REPAIR", "APPRAISAL", "CONSIGNMENT", "OTHER"], {
    error: "Précisez le contexte.",
  }),
  observedSerial: optionalText(64),
  location: optionalText(120),
  message: z
    .string()
    .trim()
    .min(10, "Décrivez la situation en quelques mots (10 caractères minimum).")
    .max(4000),
  confirm: z
    .preprocess((v) => v === "on" || v === "true", z.boolean())
    .refine((v) => v, "Merci de confirmer."),
});

export const bookmarkNoteSchema = z.object({ note: optionalText(500) });

export const companyContactSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(6, "Téléphone requis.")
    .max(30)
    .regex(/^[+0-9 ().-]+$/, "Numéro de téléphone invalide."),
  website: optionalText(200).refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "L'URL doit commencer par https://"),
  addressLine: z.string().trim().min(3, "Adresse requise.").max(200),
  postalCode: z.string().trim().min(2).max(12),
  city: z.string().trim().min(1).max(100),
});
