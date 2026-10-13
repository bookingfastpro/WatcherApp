import "server-only";
import { db } from "./db";
import { hashPassword } from "./auth/password";
import { randomToken } from "./auth/crypto";
import { deleteQuietly } from "./storage";

/**
 * Anonymisation d'un compte (droit à l'effacement).
 *
 * Choix par défaut — À VALIDER JURIDIQUEMENT :
 *  - les documents privés (plaintes, factures, Kbis) sont supprimés ;
 *  - les déclarations non vérifiées sont supprimées ;
 *  - les déclarations vérifiées / retrouvées conservent uniquement l'identification de la montre
 *    (intérêt légitime : prévention du recel), leurs champs confidentiels sont effacés ;
 *  - l'utilisateur est anonymisé (la ligne est conservée pour l'intégrité référentielle et l'audit).
 */
export async function anonymizeUser(userId: string): Promise<{ deletedReports: number; keptReports: number; deletedFiles: number }> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      professionalProfile: { include: { documents: true } },
      theftReports: { include: { documents: true, watch: { include: { images: true } } } },
    },
  });

  const keysToDelete: string[] = [];
  const toDelete = user.theftReports.filter((r) => !["VERIFIED", "RECOVERED"].includes(r.status));
  const toKeep = user.theftReports.filter((r) => ["VERIFIED", "RECOVERED"].includes(r.status));

  for (const r of user.theftReports) keysToDelete.push(...r.documents.map((d) => d.storageKey));
  for (const r of toDelete) keysToDelete.push(...r.watch.images.map((i) => i.storageKey));
  keysToDelete.push(...(user.professionalProfile?.documents.map((d) => d.storageKey) ?? []));

  const scrambled = await hashPassword(randomToken(32));

  await db.$transaction([
    db.privateDocument.deleteMany({
      where: {
        OR: [
          { theftReportId: { in: user.theftReports.map((r) => r.id) } },
          ...(user.professionalProfile ? [{ professionalProfileId: user.professionalProfile.id }] : []),
        ],
      },
    }),
    // Suppression de la montre → cascade sur la déclaration, ses images et ses messages.
    db.watch.deleteMany({ where: { id: { in: toDelete.map((r) => r.watchId) } } }),
    db.theftReport.updateMany({
      where: { id: { in: toKeep.map((r) => r.id) } },
      data: { circumstances: null, privateDescription: null, policeService: null, adminNotes: null },
    }),
    db.reportMessage.deleteMany({ where: { theftReportId: { in: toKeep.map((r) => r.id) } } }),
    db.session.deleteMany({ where: { userId } }),
    db.authToken.deleteMany({ where: { userId } }),
    db.bookmark.deleteMany({ where: { userId } }),
    ...(user.professionalProfile
      ? [
          db.professionalProfile.update({
            where: { id: user.professionalProfile.id },
            data: { verificationStatus: "SUSPENDED", phone: "—", reviewNote: "Compte supprimé à la demande du titulaire." },
          }),
        ]
      : []),
    db.user.update({
      where: { id: userId },
      data: {
        email: `supprime-${userId}@anonymise.invalid`,
        firstName: null,
        lastName: null,
        phone: null,
        passwordHash: scrambled,
        status: "DELETED",
        deletedAt: new Date(),
        marketingConsent: false,
      },
    }),
  ]);

  await deleteQuietly(keysToDelete);
  return { deletedReports: toDelete.length, keptReports: toKeep.length, deletedFiles: keysToDelete.length };
}
