import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { getProContext } from "@/server/auth/guards";
import { proCanViewReport } from "@/server/search";
import { rateLimit } from "@/server/rate-limit";
import { storage } from "@/server/storage";
import { fileResponse, ID_PATTERN, notFoundResponse } from "@/server/file-response";

export const dynamic = "force-dynamic";

/**
 * Photo d'une montre. Autorisée pour :
 *  - l'administrateur ;
 *  - le propriétaire de la déclaration ;
 *  - un professionnel avec accès actif, si la photo est autorisée ET qu'il a obtenu
 *    cette déclaration via une recherche récente (ou la suit).
 * Toute autre requête reçoit un 404 (on ne confirme pas l'existence de la ressource).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFoundResponse();

  const session = await getSession();
  if (!session) return notFoundResponse();
  const user = session.user;

  if (!(await rateLimit(`img:${user.id}`, 600, 3600)).ok) {
    return new Response("Too many requests", { status: 429 });
  }

  const img = await db.watchImage.findUnique({
    where: { id },
    select: {
      storageKey: true,
      mimeType: true,
      visibleToProfessionals: true,
      moderationStatus: true,
      watch: { select: { report: { select: { id: true, ownerId: true, status: true } } } },
    },
  });
  const report = img?.watch.report;
  if (!img || !report) return notFoundResponse();

  let allowed = user.role === "ADMIN" || report.ownerId === user.id;
  if (!allowed && img.visibleToProfessionals && img.moderationStatus !== "REJECTED" && report.status !== "REJECTED") {
    const ctx = await getProContext();
    allowed = Boolean(ctx?.access.allowed) && (await proCanViewReport(user, report.id));
  }
  if (!allowed) return notFoundResponse();

  const body = await storage().get(img.storageKey);
  if (!body) return notFoundResponse();
  return fileResponse(body, img.mimeType);
}
