import { getCurrentUser } from "@/server/auth/guards";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";

const NAV = [
  { href: "/#fonctionnement", label: "Fonctionnement" },
  { href: "/revendeurs-de-confiance", label: "Revendeurs de confiance" },
  { href: "/professionnels", label: "Professionnels" },
  { href: "/#securite", label: "Sécurité" },
];

export function homeFor(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "PROFESSIONAL") return "/pro";
  return "/espace";
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-ivory backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 md:px-8">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-[13.5px] text-ivory/70 transition-colors hover:text-ivory">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <ButtonLink href={homeFor(user.role)} variant="light" size="sm">
              Mon espace
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/connexion" variant="outline-light" size="sm">
                Connexion
              </ButtonLink>
              <ButtonLink href="/inscription" variant="light" size="sm">
                Déclarer un vol
              </ButtonLink>
            </>
          )}
        </div>
        <MobileMenu
          items={NAV}
          cta={user ? { href: homeFor(user.role), label: "Mon espace" } : { href: "/inscription", label: "Déclarer un vol" }}
          secondary={user ? undefined : { href: "/connexion", label: "Connexion" }}
        />
      </div>
    </header>
  );
}
