import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Export RGPD (droit d'accès / portabilité) : toutes les données du compte au format JSON. */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;
  if (!(await rateLimit(`export:${userId}`, 5, 3600)).ok) return new Response("Too many requests", { status: 429 });

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      marketingConsent: true,
      professionalProfile: {
        select: {
          companyName: true,
          legalName: true,
          registrationNumber: true,
          vatNumber: true,
          activity: true,
          addressLine: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
          website: true,
          verificationStatus: true,
          submittedAt: true,
          subscriptions: { select: { status: true, currentPeriodEnd: true, createdAt: true, source: true } },
          documents: { select: { kind: true, originalName: true, createdAt: true, sizeBytes: true } },
        },
      },
      theftReports: {
        select: {
          publicRef: true,
          status: true,
          theftDate: true,
          theftCity: true,
          theftCountry: true,
          circumstances: true,
          privateDescription: true,
          policeReportFiled: true,
          policeReportNumber: true,
          policeService: true,
          createdAt: true,
          watch: {
            select: {
              brand: true,
              model: true,
              reference: true,
              serialNumber: true,
              yearApprox: true,
              caseMaterial: true,
              caseSizeMm: true,
              dialColor: true,
              strap: true,
              distinctiveMarks: true,
            },
          },
          documents: { select: { kind: true, originalName: true, createdAt: true } },
          messages: { select: { body: true, fromAdmin: true, kind: true, createdAt: true } },
        },
      },
      searches: { select: { type: true, criteria: true, resultCount: true, createdAt: true }, take: 5000, orderBy: { createdAt: "desc" } },
      matchReports: { select: { context: true, message: true, status: true, createdAt: true } },
      bookmarks: { select: { createdAt: true, note: true } },
    },
  });

  await audit({ category: "ACCOUNT", action: "gdpr.data_exported", actor: { id: userId, role: session.user.role }, targetType: "User", targetId: userId });

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), note: "Les fichiers (photos, documents) sont disponibles sur demande.", data: user }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
