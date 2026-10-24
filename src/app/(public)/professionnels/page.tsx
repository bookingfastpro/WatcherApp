import type { Metadata } from "next";
import { db } from "@/server/db";
import { ButtonLink } from "@/components/ui/button";
import { PlanCard } from "@/components/pro/plan-card";
import { ACTIVITY_LABEL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Accès professionnel",
  description: "Horlogers, bijoutiers, revendeurs : vérifiez qu'une montre n'a pas été déclarée volée avant de l'acheter, la reprendre ou la réparer.",
};

const PROCESS = [
  { t: "Demande d'accès", d: "Créez votre compte et transmettez votre justificatif d'immatriculation." },
  { t: "Vérification", d: "Notre équipe contrôle votre activité professionnelle, généralement sous 2 jours ouvrés." },
  { t: "Abonnement", d: "Choisissez votre offre et payez en ligne en toute sécurité (Stripe)." },
  { t: "Vérifications illimitées*", d: "Contrôlez les montres qui vous sont proposées, en quelques secondes." },
];

export default async function ProfessionalsPage() {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 md:px-8 md:pt-24">
          <p className="eyebrow !text-ivory/45">Accès professionnel</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.03] md:text-[4.2rem]">
            Le réflexe de vérification, intégré à chaque transaction.
          </h1>
          <p className="mt-7 max-w-2xl text-[16px] leading-relaxed text-ivory/60">
            Réservé aux professionnels vérifiés : {Object.values(ACTIVITY_LABEL).slice(0, 6).join(", ").toLowerCase()}…
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/inscription/professionnel" variant="light" size="lg">
              Demander un accès
            </ButtonLink>
            <ButtonLink href="/connexion" variant="outline-light" size="lg">
              J'ai déjà un compte
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white lg:bg-ivory">
        <ol className="mx-auto grid max-w-7xl gap-px bg-line md:grid-cols-4">
          {PROCESS.map((p, i) => (
            <li key={p.t} className="bg-white lg:bg-ivory px-6 py-12 md:px-8">
              <span className="serial text-sm text-brass">0{i + 1}</span>
              <h2 className="mt-5 font-display text-2xl text-ink">{p.t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-5xl px-5 py-24 md:px-8">
          <div className="text-center">
            <p className="eyebrow">Offres</p>
            <h2 className="mt-4 font-display text-4xl text-ink md:text-5xl">Un abonnement, sans engagement caché.</h2>
          </div>
          {plans.length ? (
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {plans.map((p, i) => (
                <PlanCard key={p.id} plan={p} highlighted={i === plans.length - 1 && plans.length > 1}>
                  <ButtonLink
                    href="/inscription/professionnel"
                    variant={i === plans.length - 1 && plans.length > 1 ? "light" : "primary"}
                    className="w-full"
                  >
                    Demander un accès
                  </ButtonLink>
                </PlanCard>
              ))}
            </div>
          ) : (
            <p className="mt-14 text-center text-sm text-slate">Les offres seront publiées prochainement.</p>
          )}
          <p className="mt-8 text-center text-xs text-smoke">
            * Dans la limite d'un usage professionnel normal : des quotas techniques protègent la base contre l'extraction automatisée.
          </p>
        </div>
      </section>
    </>
  );
}
