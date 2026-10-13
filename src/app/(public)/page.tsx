import Link from "next/link";
import { ArrowRight, EyeOff, FileLock2, Fingerprint, KeyRound, ScrollText, ServerCog } from "lucide-react";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { listPublishedPartners } from "@/server/partners";
import { ButtonLink } from "@/components/ui/button";
import { PartnerCard } from "@/components/partners/partner-card";

const STEPS = [
  {
    n: "01",
    title: "Le propriétaire déclare",
    text: "Gratuitement, avec les caractéristiques de la montre, ses photos et son dépôt de plainte. Les justificatifs restent strictement privés.",
  },
  {
    n: "02",
    title: "Nous vérifions",
    text: "Notre équipe contrôle la cohérence de la déclaration et des pièces fournies, puis attribue un statut clair.",
  },
  {
    n: "03",
    title: "Le professionnel contrôle",
    text: "Avant un achat, une reprise ou une réparation, l'horloger ou le revendeur vérifie le numéro de série en quelques secondes.",
  },
];

const OWNER_BENEFITS = [
  "Déclaration gratuite et guidée, en une dizaine de minutes",
  "Vos coordonnées ne sont jamais communiquées aux professionnels",
  "Suivi du statut et échanges avec l'équipe de vérification",
  "Alerte transmise si une montre correspondante est présentée à un professionnel",
];

const PRO_BENEFITS = [
  "Vérification instantanée par numéro de série",
  "Recherche avancée par marque, modèle et référence",
  "Historique horodaté de vos vérifications (diligence)",
  "Signalement confidentiel d'une possession potentielle",
];

const SECURITY = [
  { icon: <EyeOff />, title: "Séparation des données", text: "L'identification de la montre et l'identité du propriétaire sont stockées et exposées séparément." },
  { icon: <FileLock2 />, title: "Documents privés", text: "Plaintes et factures sont stockées hors de tout accès public et consultables uniquement par l'équipe de vérification." },
  { icon: <Fingerprint />, title: "Professionnels contrôlés", text: "Chaque compte professionnel est vérifié manuellement avant tout accès à la base." },
  { icon: <ScrollText />, title: "Traçabilité", text: "Chaque recherche et chaque accès sensible sont journalisés et auditables." },
  { icon: <ServerCog />, title: "Anti-extraction", text: "Correspondance exacte, résultats plafonnés, quotas et détection des comportements anormaux." },
  { icon: <KeyRound />, title: "Sécurité des comptes", text: "Mots de passe hachés (Argon2id), vérification email, verrouillage après tentatives répétées." },
];

const FAQ = [
  {
    q: "La déclaration remplace-t-elle un dépôt de plainte ?",
    a: "Non. La plateforme complète la plainte déposée auprès de la police ou de la gendarmerie : elle permet aux professionnels de détecter une montre signalée. Nous vous recommandons toujours de déposer plainte.",
  },
  {
    q: "Qui peut voir ma déclaration ?",
    a: "Uniquement les professionnels dont le compte a été vérifié et qui disposent d'un abonnement actif, et seulement lorsqu'ils recherchent précisément cette montre. Ils voient ses caractéristiques, jamais votre nom, vos coordonnées, votre plainte ou vos factures.",
  },
  {
    q: "Que se passe-t-il si un professionnel retrouve ma montre ?",
    a: "Le professionnel nous transmet un signalement confidentiel. Notre équipe vous contacte et coordonne la suite, le cas échéant avec les autorités. Vos coordonnées ne lui sont pas communiquées automatiquement.",
  },
  {
    q: "Combien coûte le service ?",
    a: "La déclaration est gratuite pour les particuliers. L'accès à la base de vérification est réservé aux professionnels, sur abonnement.",
  },
  {
    q: "Que faire si je retrouve ma montre ?",
    a: "Indiquez-le depuis votre espace en un clic : la déclaration passe au statut « Montre retrouvée » et les professionnels ne voient plus d'alerte de vol.",
  },
  {
    q: "Comment mes données sont-elles protégées ?",
    a: "Données minimisées, documents stockés de façon privée, accès journalisés, adresses IP pseudonymisées dans les journaux. Vous pouvez exporter vos données ou demander la suppression de votre compte depuis vos paramètres.",
  },
];

async function publicStats() {
  const settings = await getSettings();
  if (!settings.publicStatsEnabled) return null;
  // Uniquement des données réelles : les données de démonstration sont exclues.
  const [verified, recovered, pros] = await Promise.all([
    db.theftReport.count({ where: { status: "VERIFIED", isDemo: false } }),
    db.theftReport.count({ where: { status: "RECOVERED", isDemo: false } }),
    db.professionalProfile.count({ where: { verificationStatus: "APPROVED", user: { isDemo: false } } }),
  ]);
  if (verified < settings.publicStatsMinimum) return null;
  return { verified, recovered, pros };
}

export default async function HomePage() {
  const [stats, partners] = await Promise.all([publicStats(), listPublishedPartners({ take: 6 })]);
  const featured = partners.filter((p) => p.verified).slice(0, 3);

  return (
    <>
      {/* ─── Hero */}
      <section className="relative overflow-hidden bg-ink text-ivory">
        <HeroDial />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 pb-28 pt-20 md:px-8 md:pb-36 md:pt-28 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="fade-in">
            <p className="eyebrow !text-ivory/45">Registre privé des montres déclarées volées</p>
            <h1 className="mt-7 font-display text-[2.9rem] leading-[1.02] tracking-[-0.01em] sm:text-6xl lg:text-[4.6rem]">
              Vérifiez l'histoire d'une montre avant qu'elle ne change de poignet.
            </h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ivory/65">
              Les propriétaires signalent gratuitement une montre volée. Les professionnels vérifiés contrôlent,
              en quelques secondes, les montres qui leur sont proposées — sans jamais accéder aux données personnelles des victimes.
            </p>
            <div className="mt-11 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/inscription" variant="light" size="lg">
                Déclarer une montre volée
              </ButtonLink>
              <ButtonLink href="/professionnels" variant="outline-light" size="lg">
                Accès professionnel <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <InterfacePreview />
        </div>
      </section>

      {/* ─── Fonctionnement */}
      <section id="fonctionnement" className="scroll-mt-20 border-b border-line bg-ivory">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className="max-w-2xl">
            <p className="eyebrow">Fonctionnement</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">Trois étapes, un seul objectif : rendre une montre volée invendable.</h2>
          </div>
          <ol className="mt-16 grid gap-px bg-line md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-ivory p-8 md:p-10">
                <span className="serial text-sm text-brass">{s.n}</span>
                <h3 className="mt-6 font-display text-3xl text-ink">{s.title}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-slate">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Bénéfices */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-px bg-line px-0 md:grid-cols-2">
          <Benefits
            eyebrow="Propriétaires"
            title="Votre montre signalée, votre identité protégée."
            items={OWNER_BENEFITS}
            cta={{ href: "/inscription", label: "Déclarer gratuitement" }}
          />
          <Benefits
            eyebrow="Professionnels"
            title="Un contrôle systématique, en quelques secondes."
            items={PRO_BENEFITS}
            cta={{ href: "/professionnels", label: "Découvrir l'accès pro" }}
          />
        </div>
      </section>

      {/* ─── Statistiques (réelles uniquement) */}
      <section className="border-y border-line bg-ivory">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          {stats ? (
            <dl className="grid gap-10 text-center sm:grid-cols-3">
              {[
                { label: "Déclarations vérifiées", value: stats.verified },
                { label: "Montres retrouvées", value: stats.recovered },
                { label: "Professionnels vérifiés", value: stats.pros },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="eyebrow">{s.label}</dt>
                  <dd className="mt-3 font-display text-6xl text-ink">{s.value.toLocaleString("fr-FR")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Chiffres clés</p>
              <p className="mt-4 font-display text-3xl leading-snug text-ink">
                Nos statistiques seront publiées dès que la base disposera d'un volume de données réel et significatif.
              </p>
              <p className="mt-3 text-sm text-smoke">Nous ne publions aucun chiffre estimé ou fictif.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Revendeurs de confiance */}
      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Revendeurs de confiance</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">Des professionnels engagés, vérifiés selon des critères publics.</h2>
            </div>
            <Link href="/revendeurs-de-confiance" className="inline-flex items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
              Tous les revendeurs <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {featured.length ? (
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {featured.map((p) => (
                <PartnerCard key={p.id} partner={p} />
              ))}
            </div>
          ) : (
            <div className="mt-14 border border-dashed border-line-strong px-8 py-16 text-center">
              <p className="font-display text-2xl text-ink">Les premiers revendeurs de confiance seront présentés ici.</p>
              <p className="mt-2 text-sm text-slate">Emplacement réservé — aucun partenaire n'est encore publié.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Sécurité */}
      <section id="securite" className="scroll-mt-20 bg-ink text-ivory">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className="max-w-2xl">
            <p className="eyebrow !text-ivory/45">Sécurité & confidentialité</p>
            <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">La confidentialité des victimes n'est pas une option.</h2>
          </div>
          <ul className="mt-16 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((s) => (
              <li key={s.title} className="bg-ink p-8">
                <span className="text-ivory/60 [&>svg]:size-5" aria-hidden>
                  {s.icon}
                </span>
                <h3 className="mt-6 text-[17px] font-medium">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/55">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── FAQ */}
      <section id="faq" className="scroll-mt-20 bg-ivory">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">Questions fréquentes</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">Ce qu'il faut savoir.</h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="relative size-4 shrink-0" aria-hidden>
                    <span className="absolute left-0 top-1/2 h-px w-4 bg-ink" />
                    <span className="absolute left-1/2 top-0 h-4 w-px bg-ink transition-transform duration-300 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA final */}
      <section className="bg-paper">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center md:py-32">
          <h2 className="font-display text-4xl leading-tight text-ink md:text-6xl">Une montre volée ne devrait jamais pouvoir être revendue en toute discrétion.</h2>
          <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/inscription" size="lg">
              Déclarer une montre volée
            </ButtonLink>
            <ButtonLink href="/inscription/professionnel" variant="secondary" size="lg">
              Devenir professionnel vérifié
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function Benefits({ eyebrow, title, items, cta }: { eyebrow: string; title: string; items: string[]; cta: { href: string; label: string } }) {
  return (
    <div className="bg-paper px-5 py-20 md:px-14 md:py-24">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 max-w-md font-display text-4xl leading-tight text-ink">{title}</h2>
      <ul className="mt-10 space-y-4">
        {items.map((it) => (
          <li key={it} className="flex gap-4 border-t border-line pt-4 text-[15px] text-graphite">
            <span className="mt-2 size-1.5 shrink-0 bg-ink" aria-hidden />
            {it}
          </li>
        ))}
      </ul>
      <Link href={cta.href} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
        {cta.label} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** Illustration de l'interface (clairement libellée comme telle, sans donnée réelle). */
function InterfacePreview() {
  return (
    <figure className="relative hidden lg:block" aria-label="Illustration de l'interface de vérification">
      <div className="border border-white/12 bg-anthracite/80 p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur">
        <p className="eyebrow !text-ivory/40">Numéro de série</p>
        <div className="mt-3 flex items-center justify-between border border-white/15 bg-ink px-4 py-4">
          <span className="serial text-xl tracking-[0.18em] text-ivory/80">•••• •• ••••</span>
          <span className="bg-ivory px-4 py-2 text-xs font-medium text-ink">Vérifier</span>
        </div>
        <div className="mt-5 border-l-2 border-[#b4574d] bg-[#8c2c23]/25 px-4 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-ivory">Montre signalée volée</p>
          <p className="mt-1 text-xs text-ivory/60">Déclaration vérifiée · identité du propriétaire protégée</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 bg-white/10" style={{ width: `${90 - i * 20}%` }} />
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-right text-[11px] uppercase tracking-[0.2em] text-ivory/30">Illustration</figcaption>
    </figure>
  );
}

function HeroDial() {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 600" aria-hidden className="pointer-events-none absolute -right-48 -top-24 size-[860px] text-white/[0.05]">
      <circle cx="300" cy="300" r="296" fill="none" stroke="currentColor" />
      <circle cx="300" cy="300" r="230" fill="none" stroke="currentColor" strokeWidth="0.6" />
      {ticks.map((i) => {
        const a = (i / 60) * Math.PI * 2;
        const long = i % 5 === 0;
        return (
          <line
            key={i}
            x1={300 + Math.sin(a) * (long ? 250 : 264)}
            y1={300 - Math.cos(a) * (long ? 250 : 264)}
            x2={300 + Math.sin(a) * 280}
            y2={300 - Math.cos(a) * 280}
            stroke="currentColor"
            strokeWidth={long ? 3 : 1}
          />
        );
      })}
    </svg>
  );
}
