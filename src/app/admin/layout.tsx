import type { Metadata } from "next";
import {
  Activity,
  BadgeCheck,
  Building2,
  CreditCard,
  FileSearch,
  FileWarning,
  Gauge,
  Handshake,
  ScrollText,
  Settings,
  ShieldQuestion,
  Users,
  Watch,
} from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar-nav";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pendingReports, pendingPros, openMatches, pendingGdpr] = await Promise.all([
    db.theftReport.count({ where: { status: "PENDING" } }),
    db.professionalProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.potentialMatchReport.count({ where: { status: "OPEN" } }),
    db.dataRequest.count({ where: { status: "PENDING" } }),
  ]);

  const items: NavItem[] = [
    { href: "/admin", label: "Vue générale", icon: <Gauge />, exact: true },
    { href: "/admin/declarations", label: "Déclarations", icon: <Watch />, badge: pendingReports },
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: <Users /> },
    { href: "/admin/professionnels", label: "Professionnels", icon: <Building2 /> },
    { href: "/admin/validations", label: "Demandes de validation", icon: <BadgeCheck />, badge: pendingPros },
    { href: "/admin/partenaires", label: "Partenaires", icon: <Handshake /> },
    { href: "/admin/abonnements", label: "Abonnements", icon: <CreditCard /> },
    { href: "/admin/signalements", label: "Signalements", icon: <FileWarning />, badge: openMatches },
    { href: "/admin/recherches", label: "Recherches", icon: <FileSearch /> },
    { href: "/admin/rgpd", label: "Demandes RGPD", icon: <ShieldQuestion />, badge: pendingGdpr },
    { href: "/admin/audit", label: "Journal d'audit", icon: <ScrollText /> },
    { href: "/admin/parametres", label: "Paramètres", icon: <Settings /> },
    { href: "/pro", label: "Outil de recherche", icon: <Activity /> },
  ];

  return (
    <AppShell section="Administration" items={items} user={admin}>
      {children}
    </AppShell>
  );
}
