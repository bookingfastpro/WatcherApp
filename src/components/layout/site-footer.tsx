import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  {
    title: "Propriétaires",
    links: [
      { href: "/inscription", label: "Déclarer une montre volée" },
      { href: "/connexion", label: "Suivre ma déclaration" },
      { href: "/#faq", label: "Questions fréquentes" },
    ],
  },
  {
    title: "Professionnels",
    links: [
      { href: "/professionnels", label: "Accès professionnel" },
      { href: "/inscription/professionnel", label: "Créer un compte pro" },
      { href: "/revendeurs-de-confiance", label: "Revendeurs de confiance" },
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/confidentialite", label: "Politique de confidentialité" },
      { href: "/conditions", label: "Conditions d'utilisation" },
      { href: "/mentions-legales", label: "Mentions légales" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ivory">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-5 text-sm leading-relaxed text-ivory/55">
            Registre privé des montres déclarées volées. Déclaration gratuite pour les propriétaires,
            vérification réservée aux professionnels contrôlés.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="eyebrow !text-ivory/40">{col.title}</p>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ivory/75 transition-colors hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-ivory/40 md:px-8">
          <p>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? "Watcher"}. Tous droits réservés.</p>
          <p>Un signalement sur la plateforme ne remplace pas un dépôt de plainte auprès des autorités.</p>
        </div>
      </div>
    </footer>
  );
}
