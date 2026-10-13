import { FilePlus2, LayoutGrid, Settings, Briefcase, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";
import { requireUser } from "@/server/auth/guards";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items: NavItem[] = [
    { href: "/espace", label: "Mes déclarations", icon: <LayoutGrid />, exact: true },
    { href: "/espace/declarations/nouvelle", label: "Nouvelle déclaration", icon: <FilePlus2 /> },
    { href: "/espace/parametres", label: "Paramètres du compte", icon: <Settings /> },
  ];
  if (user.role === "PROFESSIONAL") items.push({ href: "/pro", label: "Espace professionnel", icon: <Briefcase /> });
  if (user.role === "ADMIN") items.push({ href: "/admin", label: "Administration", icon: <ShieldCheck /> });

  return (
    <AppShell section="Espace propriétaire" items={items} user={user}>
      {children}
    </AppShell>
  );
}
