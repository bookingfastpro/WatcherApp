import { Clock, CreditCard, ShieldAlert, ShieldX } from "lucide-react";
import type { ProAccessReason } from "@/lib/access";
import { ButtonLink } from "@/components/ui/button";

type Gate = { icon: React.ReactNode; title: string; text: string; cta?: { href: string; label: string } };

const GATES: Partial<Record<ProAccessReason, Gate>> = {
  PROFILE_PENDING: {
    icon: <Clock className="size-8" strokeWidth={1.25} />,
    title: "Votre compte est en cours de validation",
    text: "Notre équipe vérifie les informations de votre entreprise (généralement sous 2 jours ouvrés). Vous serez averti par email ; vous pourrez alors souscrire un abonnement.",
    cta: { href: "/pro/entreprise", label: "Compléter mon dossier" },
  },
  PROFILE_REJECTED: {
    icon: <ShieldX className="size-8" strokeWidth={1.25} />,
    title: "Votre demande n'a pas été validée",
    text: "Consultez le motif indiqué dans votre profil entreprise. Vous pouvez nous contacter pour apporter des éléments complémentaires.",
    cta: { href: "/pro/entreprise", label: "Voir mon profil" },
  },
  PROFILE_SUSPENDED: {
    icon: <ShieldAlert className="size-8" strokeWidth={1.25} />,
    title: "Accès professionnel suspendu",
    text: "L'accès à la base a été suspendu par l'équipe de la plateforme. Contactez-nous pour plus d'informations.",
  },
  NO_SUBSCRIPTION: {
    icon: <CreditCard className="size-8" strokeWidth={1.25} />,
    title: "Un abonnement est nécessaire",
    text: "Votre compte est validé. Souscrivez une offre pour accéder à la vérification des montres.",
    cta: { href: "/pro/abonnement", label: "Choisir une offre" },
  },
};

export function AccessGate({ reason }: { reason: ProAccessReason }) {
  const g: Gate = GATES[reason] ?? {
    icon: <ShieldAlert className="size-8" strokeWidth={1.25} />,
    title: "Accès indisponible",
    text: "Votre compte ne permet pas d'accéder à la base professionnelle.",
  };
  return (
    <div className="border border-line bg-paper px-8 py-16 text-center md:px-16">
      <div className="mx-auto flex size-16 items-center justify-center border border-line text-ink">{g.icon}</div>
      <h2 className="mt-8 font-display text-3xl text-ink">{g.title}</h2>
      <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-slate">{g.text}</p>
      {g.cta ? (
        <ButtonLink href={g.cta.href} className="mt-8">
          {g.cta.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
