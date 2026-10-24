import { ButtonLink } from "@/components/ui/button";
import { LogoImage } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white lg:bg-ivory px-6 text-center">
      <LogoImage onLight className="h-8" />
      <p className="eyebrow mt-10">Erreur 404</p>
      <h1 className="mt-4 font-display text-5xl text-ink">Page introuvable</h1>
      <p className="mt-4 max-w-md text-slate">La page demandée n'existe pas ou n'est pas accessible avec votre compte.</p>
      <ButtonLink href="/" className="mt-10">
        Retour à l'accueil
      </ButtonLink>
    </main>
  );
}
