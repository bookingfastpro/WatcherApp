import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { db } from "@/server/db";
import { requireProArea } from "@/server/auth/guards";
import { EmptyState, PageHeader, DemoBadge } from "@/components/ui/primitives";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { WatchImage } from "@/components/watch/watch-image";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dossiers suivis" };

export default async function ProBookmarksPage() {
  const { user } = await requireProArea();
  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id, theftReport: { status: { not: "REJECTED" } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      note: true,
      createdAt: true,
      theftReport: {
        select: {
          publicRef: true,
          status: true,
          isDemo: true,
          watch: {
            select: {
              brand: true,
              model: true,
              reference: true,
              images: {
                where: { visibleToProfessionals: true, moderationStatus: { not: "REJECTED" } },
                select: { id: true },
                orderBy: { position: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Suivi"
        title="Dossiers suivis"
        description="Les déclarations que vous suivez restent consultables et leur statut est mis à jour en temps réel."
      />
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-10" strokeWidth={1} />}
          title="Aucun dossier suivi"
          description="Depuis la fiche d'une déclaration, cliquez sur « Suivre ce dossier » pour la retrouver ici."
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((b) => {
            const r = b.theftReport;
            return (
              <li key={b.id}>
                <Link href={`/pro/declarations/${r.publicRef}`} className="block border border-line bg-paper transition-shadow hover:shadow-[var(--shadow-card)]">
                  <WatchImage imageId={r.watch.images[0]?.id} alt={`${r.watch.brand} ${r.watch.model}`} className="aspect-[16/10] w-full" />
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <ReportStatusBadge status={r.status} />
                      {r.isDemo ? <DemoBadge /> : null}
                    </div>
                    <p className="eyebrow mt-4">{r.watch.brand}</p>
                    <p className="font-display text-2xl text-ink">{r.watch.model}</p>
                    <p className="serial mt-2 text-xs text-smoke">
                      {r.publicRef} · suivi depuis le {formatDate(b.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
