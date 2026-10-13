import type { Metadata } from "next";
import { requireProArea } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { db } from "@/server/db";
import { SearchPanel } from "@/components/pro/search-panel";
import { AccessGate } from "@/components/pro/access-gate";
import { Notice, PageHeader } from "@/components/ui/primitives";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Vérifier une montre" };

export default async function ProHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, access } = await requireProArea();
  const sp = await searchParams;

  if (!access.allowed) {
    return (
      <>
        <PageHeader eyebrow="Espace professionnel" title="Vérification des montres" />
        {param(sp.bienvenue) ? (
          <Notice tone="ok" className="mb-8">Adresse email confirmée. Merci !</Notice>
        ) : null}
        <AccessGate reason={access.reason} />
      </>
    );
  }

  const settings = await getSettings();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const usedToday = await db.professionalSearch.count({ where: { userId: user.id, blocked: false, createdAt: { gte: start } } });

  return (
    <>
      <PageHeader
        eyebrow="Vérification avant transaction"
        title="Contrôler une montre"
        description="Saisissez le numéro de série tel qu'il est gravé. Espaces, points et tirets sont ignorés."
      />
      <SearchPanel quota={Math.max(0, settings.searchDailyQuota - usedToday)} />
      <div className="mt-16 grid gap-6 border-t border-line pt-10 text-sm leading-relaxed text-slate md:grid-cols-3">
        <div>
          <p className="font-medium text-ink">Correspondance exacte</p>
          <p className="mt-2">La recherche par numéro de série compare la forme normalisée du numéro. Aucune liste n'est proposée.</p>
        </div>
        <div>
          <p className="font-medium text-ink">Données minimales</p>
          <p className="mt-2">Seules les caractéristiques de la montre sont affichées. Les informations sur le propriétaire restent confidentielles.</p>
        </div>
        <div>
          <p className="font-medium text-ink">En cas de correspondance</p>
          <p className="mt-2">Ouvrez la fiche et utilisez « Signaler une possession » : notre équipe prend le relais avec le propriétaire et, si besoin, les autorités.</p>
        </div>
      </div>
    </>
  );
}
