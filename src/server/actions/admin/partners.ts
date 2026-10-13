"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "../../db";
import { audit } from "../../audit";
import { requireAdmin } from "../../auth/guards";
import { deleteQuietly, newStorageKey, storage } from "../../storage";
import { filesFrom, processImage, UploadError } from "../../uploads";
import { textEntries } from "../../reports";
import { fail, fromZodError, ok, type ActionState } from "@/lib/action-state";
import { partnerSchema } from "@/lib/validation/admin";
import { PARTNER_CRITERIA, meetsVerificationCriteria, type PartnerCriteria } from "@/lib/partner-criteria";

function criteriaFrom(formData: FormData): PartnerCriteria {
  const out: PartnerCriteria = {};
  for (const c of PARTNER_CRITERIA) if (formData.get(`criteria.${c.key}`) === "on") out[c.key] = true;
  return out;
}

/** Création / mise à jour d'un partenaire. `partnerId` null = création. */
export async function savePartner(partnerId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = partnerSchema.safeParse(textEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { wantVerified, ...v } = parsed.data;
  const criteria = criteriaFrom(formData);

  // Le badge ne peut être accordé que si les critères obligatoires sont remplis (règle serveur).
  if (wantVerified && !meetsVerificationCriteria(criteria)) {
    return fail("Le badge « Partenaire vérifié » exige que tous les critères obligatoires soient cochés.", {
      wantVerified: ["Critères obligatoires incomplets."],
    });
  }

  let logo: { key: string; mime: string } | null = null;
  const logoFile = filesFrom(formData, "logo")[0];
  if (logoFile) {
    try {
      const img = await processImage(logoFile);
      const key = newStorageKey("partners", "webp");
      await storage().put(key, img.buffer, img.mimeType);
      logo = { key, mime: img.mimeType };
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message, { logo: [e.message] });
      throw e;
    }
  }

  const existing = partnerId ? await db.partner.findUnique({ where: { id: partnerId } }) : null;
  if (partnerId && !existing) return fail("Partenaire introuvable.");

  const data = {
    ...v,
    verificationCriteria: criteria as Prisma.InputJsonValue,
    verified: wantVerified,
    verifiedAt: wantVerified ? (existing?.verified ? existing.verifiedAt : new Date()) : null,
    ...(logo ? { logoKey: logo.key, logoMimeType: logo.mime } : {}),
  };

  let id: string;
  try {
    const saved = existing
      ? await db.partner.update({ where: { id: existing.id }, data })
      : await db.partner.create({ data });
    id = saved.id;
  } catch (e) {
    if (logo) await deleteQuietly([logo.key]);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Cet identifiant d'URL (slug) est déjà utilisé.", { slug: ["Déjà utilisé."] });
    }
    throw e;
  }
  if (logo && existing?.logoKey) await deleteQuietly([existing.logoKey]);

  await audit({
    category: "ADMIN",
    action: existing ? "partner.updated" : "partner.created",
    actor: { id: admin.id, role: admin.role },
    targetType: "Partner",
    targetId: id,
    metadata: { verified: wantVerified, published: v.isPublished, sponsored: v.isSponsored },
  });
  revalidatePath("/revendeurs-de-confiance");
  revalidatePath("/admin/partenaires");
  if (!existing) redirect(`/admin/partenaires/${id}?cree=1`);
  revalidatePath(`/admin/partenaires/${id}`);
  return ok("Partenaire enregistré.");
}

export async function deletePartner(partnerId: string, _: ActionState, _fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = await db.partner.findUnique({ where: { id: partnerId } });
  if (!p) return fail("Partenaire introuvable.");
  await db.partner.delete({ where: { id: p.id } });
  if (p.logoKey) await deleteQuietly([p.logoKey]);
  await audit({ category: "ADMIN", action: "partner.deleted", actor: { id: admin.id, role: admin.role }, targetType: "Partner", targetId: p.id, metadata: { name: p.name } });
  revalidatePath("/revendeurs-de-confiance");
  redirect("/admin/partenaires");
}
