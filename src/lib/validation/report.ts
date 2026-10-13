import { z } from "zod";
import "../zod-fr";
import { COUNTRY_CODES } from "../countries";

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `${max} caractères maximum.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const currentYear = new Date().getFullYear();

/** Champs d'identification de la montre (modèle Watch). */
export const watchFieldsSchema = z.object({
  brand: z.string().trim().min(1, "Marque requise.").max(80),
  model: z.string().trim().min(1, "Modèle requis.").max(120),
  reference: optionalText(64),
  serialNumber: optionalText(64),
  yearApprox: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1850 && v <= currentYear), "Année invalide."),
  caseMaterial: optionalText(80),
  caseSizeMm: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 10 && v <= 70), "Diamètre invalide (10 à 70 mm)."),
  dialColor: optionalText(60),
  strap: optionalText(120),
  distinctiveMarks: optionalText(1000),
});

/** Champs confidentiels de la déclaration (modèle TheftReport). */
export const theftFieldsSchema = z.object({
  theftDate: z
    .string()
    .min(1, "Date du vol requise.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
    .transform((v) => new Date(`${v.slice(0, 10)}T12:00:00.000Z`))
    .refine((d) => d.getTime() <= Date.now() + 24 * 3600 * 1000, "La date du vol ne peut pas être dans le futur.")
    .refine((d) => d.getUTCFullYear() >= 1950, "Date invalide."),
  theftCity: z.string().trim().min(1, "Ville requise.").max(100),
  theftCountry: z.enum(COUNTRY_CODES as [string, ...string[]], { error: "Pays requis." }),
  circumstances: optionalText(3000),
  privateDescription: optionalText(3000),
  policeReportFiled: z.preprocess((v) => v === "yes" || v === "on" || v === "true", z.boolean()),
  policeReportNumber: optionalText(80),
  policeService: optionalText(160),
});

export const reportSchema = watchFieldsSchema
  .extend(theftFieldsSchema.shape)
  .extend({
    certify: z
      .preprocess((v) => v === "on" || v === "true", z.boolean())
      .refine((v) => v, "Vous devez certifier l'exactitude de votre déclaration."),
  })
  .superRefine((v, ctx) => {
    if (v.policeReportFiled && !v.policeReportNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["policeReportNumber"],
        message: "Indiquez le numéro ou la référence du dépôt de plainte.",
      });
    }
  });

export const reportUpdateSchema = watchFieldsSchema.extend(theftFieldsSchema.shape);

export type ReportInput = z.infer<typeof reportSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message vide.").max(4000, "4000 caractères maximum."),
});

export const DOCUMENT_UPLOAD_KINDS = ["POLICE_REPORT", "PURCHASE_INVOICE", "OWNERSHIP_PROOF", "OTHER"] as const;
