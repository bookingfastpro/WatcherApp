import { Bookmark, Building2, CreditCard, FileWarning, History, Search, Settings, Watch, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";
import { requireProArea } from "@/server/auth/guards";
import { formatDate } from "@/lib/format";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { user, access } = await requireProArea();
  const items: NavItem[] = [
    { href: "/pro", label: "Vérifier une montre", icon: <Search />, exact: true },
    { href: "/pro/historique", label: "Historique", icon: <History /> },
    { href: "/pro/favoris", label: "Dossiers suivis", icon: <Bookmark /> },
    { href: "/pro/signalements", label: "Mes signalements", icon: <FileWarning /> },
    { href: "/pro/abonnement", label: "Abonnement", icon: <CreditCard /> },
    { href: "/pro/entreprise", label: "Entreprise", icon: <Building2 /> },
    { href: "/pro/compte", label: "Paramètres", icon: <Settings /> },
    { href: "/espace", label: "Déclarer un vol", icon: <Watch /> },
  ];
  if (user.role === "ADMIN") items.push({ href: "/admin", label: "Administration", icon: <ShieldCheck /> });

  const banner =
    access.reason === "GRACE_PERIOD" && access.graceUntil ? (
      <div className="border-b border-warn/30 bg-warn-soft px-6 py-3 text-center text-sm text-warn">
        Votre abonnement n'est plus à jour. L'accès est maintenu jusqu'au {formatDate(access.graceUntil)} —{" "}
        <a href="/pro/abonnement" className="font-medium underline">
          régulariser
        </a>
        .
      </div>
    ) : user.role === "ADMIN" ? (
      <div className="border-b border-line bg-mist px-6 py-2.5 text-center text-xs text-slate">
        Vous consultez l'espace professionnel en tant qu'administrateur. Vos recherches sont journalisées.
      </div>
    ) : null;

  return (
    <AppShell section={user.professionalProfile?.companyName ?? "Espace professionnel"} items={items} user={user} banner={banner}>
      {children}
    </AppShell>
  );
}
