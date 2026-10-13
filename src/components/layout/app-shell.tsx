import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { logout } from "@/server/actions/auth";
import { SidebarNav, type NavItem } from "./sidebar-nav";

type AppShellProps = {
  section: string;
  items: NavItem[];
  user: { email: string; firstName: string | null; lastName: string | null };
  children: React.ReactNode;
  banner?: React.ReactNode;
};

/** Coque des espaces connectés (particulier, professionnel, admin). */
export function AppShell({ section, items, user, children, banner }: AppShellProps) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const footer = (
    <div className="border-t border-white/10 p-5">
      <p className="truncate text-sm text-ivory">{name}</p>
      <p className="truncate text-xs text-ivory/45">{user.email}</p>
      <form action={logout} className="mt-4">
        <button type="submit" className="inline-flex items-center gap-2 text-xs text-ivory/60 transition-colors hover:text-ivory">
          <LogOut className="size-3.5" aria-hidden /> Se déconnecter
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden bg-ink text-ivory lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-6 pb-6 pt-7">
          <Logo />
          <p className="eyebrow mt-4 !text-ivory/40">{section}</p>
        </div>
        <SidebarNav items={items} />
        {footer}
      </aside>
      <SidebarNav items={items} mobile section={section} footer={footer} />
      <main className="min-w-0">
        {banner}
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-14">{children}</div>
      </main>
    </div>
  );
}
