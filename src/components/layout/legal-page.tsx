/** Mise en page des documents légaux. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="bg-ivory">
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <p className="eyebrow">Informations légales</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-ink">{title}</h1>
        <p className="mt-4 text-sm text-smoke">Dernière mise à jour : {updated}</p>
        <div className="mt-8 border-l-2 border-warn bg-warn-soft px-5 py-4 text-sm text-graphite">
          <strong>Document modèle — à faire valider par un professionnel du droit avant la mise en production.</strong>{" "}
          Les passages entre crochets [ … ] doivent être complétés.
        </div>
        <div className="mt-12 space-y-10 text-[15.5px] leading-relaxed text-graphite [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
    </div>
  );
}
