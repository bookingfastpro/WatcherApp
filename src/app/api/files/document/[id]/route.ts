import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import { storage } from "@/server/storage";
import { fileResponse, ID_PATTERN, notFoundResponse } from "@/server/file-response";

export const dynamic = "force-dynamic";

/**
 * Document privé (plainte, facture, Kbis…). JAMAIS accessible aux professionnels.
 * Autorisé : administrateur (accès journalisé) ou titulaire du dossier.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFoundResponse();

  const session = await getSession();
  if (!session) return notFoundResponse();
  const user = session.user;
  if (!(await rateLimit(`doc:${user.id}`, 200, 3600)).ok) return new Response("Too many requests", { status: 429 });

  const doc = await db.privateDocument.findUnique({
    where: { id },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      originalName: true,
      uploadedById: true,
      theftReport: { select: { ownerId: true } },
      professionalProfile: { select: { userId: true } },
    },
  });
  if (!doc) return notFoundResponse();

  const isAdmin = user.role === "ADMIN";
  const isHolder =
    doc.theftReport?.ownerId === user.id || doc.professionalProfile?.userId === user.id || doc.uploadedById === user.id;
  if (!isAdmin && !isHolder) return notFoundResponse();

  if (isAdmin && !isHolder) {
    await audit({
      category: "ACCESS",
      action: "admin.document_viewed",
      actor: { id: user.id, role: user.role },
      targetType: "PrivateDocument",
      targetId: doc.id,
    });
  }

  const body = await storage().get(doc.storageKey);
  if (!body) return notFoundResponse();
  const download = new URL(req.url).searchParams.get("download") === "1";
  return fileResponse(body, doc.mimeType, { filename: doc.originalName, download });
}
