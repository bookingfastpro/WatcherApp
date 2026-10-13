import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { storage } from "@/server/storage";
import { fileResponse, ID_PATTERN, notFoundResponse } from "@/server/file-response";

export const dynamic = "force-dynamic";

/** Logo d'un partenaire : public si le partenaire est publié, sinon réservé aux admins. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFoundResponse();
  const partner = await db.partner.findUnique({
    where: { id },
    select: { logoKey: true, logoMimeType: true, isPublished: true },
  });
  if (!partner?.logoKey || !partner.logoMimeType) return notFoundResponse();
  if (!partner.isPublished) {
    const session = await getSession();
    if (session?.user.role !== "ADMIN") return notFoundResponse();
  }
  const body = await storage().get(partner.logoKey);
  if (!body) return notFoundResponse();
  return fileResponse(body, partner.logoMimeType, { cache: partner.isPublished ? "public" : "private" });
}
