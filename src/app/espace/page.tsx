import type { Metadata } from "next";
import { Plus, Watch } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader, Stat } from "@/components/ui/primitives";
import { OwnerWatchCard } from "@/components/watch/owner-watch-card";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes déclarations" };

export default async function OwnerDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const reports = await db.theftReport.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicRef: true,
      status: true,
      createdAt: true,
      isDemo: true,
      watch: {
        select: {
          brand: true,
          model: true,
          reference: true,
          images: { select: { id: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
      _count: { select: { messages: { where: { fromAdmin: true, readAt: null, kind: { not: "SYSTEM" } } } } },
    },
  });

  const count = (s: string[]) => reports.filter((r) => s.includes(r.status)).length;
  const unread = reports.reduce((n, r) => n + r._count.messages, 0);
  const infoRequested = count(["INFO_REQUESTED"]);

  return (
    <>
      <PageHeader
        eyebrow={`Bonjour ${user.firstName ?? ""}`.trim()}
        title="Mes déclarations"
        description="Suivez l'état de vos déclarations et répondez aux demandes de l'équipe de vérification."
        actions={
          <ButtonLink href="/espace/declarations/nouvelle" size="lg">
            <Plus className="size-4" aria-hidden /> Déclarer une montre volée
          </ButtonLink>
        }
      />

      {param(sp.bienvenue) ? (
        <Notice tone="ok" title="Votre compte est activé" className="mb-8">
          Vous pouvez maintenant déclarer une montre volée. Préparez si possible votre dépôt de plainte et une preuve d'achat.
        </Notice>
      ) : null}
      {infoRequested > 0 ? (
        <Notice tone="warn" title="Action requise" className="mb-8">
          {infoRequested > 1 ? `${infoRequested} déclarations nécessitent` : "Une déclaration nécessite"} des informations
          complémentaires. Ouvrez-la pour consulter la demande.
        </Notice>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          icon={<Watch className="size-10" strokeWidth={1} />}
          title="Aucune déclaration pour le moment"
          description="Déclarer une montre volée est gratuit. Votre déclaration sera vérifiée puis consultable par les professionnels agréés — sans jamais révéler votre identité."
          action={<ButtonLink href="/espace/declarations/nouvelle">Commencer une déclaration</ButtonLink>}
        />
      ) : (
        <>
          <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Déclarations" value={reports.length} />
            <Stat label="En vérification" value={count(["PENDING", "INFO_REQUESTED"])} />
            <Stat label="Vérifiées" value={count(["VERIFIED"])} />
            <Stat label="Messages non lus" value={unread} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <OwnerWatchCard key={r.id} report={{ ...r, unread: r._count.messages }} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
