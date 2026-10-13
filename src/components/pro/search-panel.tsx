"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { searchAction, type SearchState } from "@/server/actions/pro";
import { Input } from "@/components/ui/form-fields";
import { DemoBadge } from "@/components/ui/primitives";
import { buttonClasses } from "@/components/ui/button";
import { ReportStatusBadge } from "@/components/watch/status-badge";
import { WatchImage } from "@/components/watch/watch-image";
import { MatchAlert, alertKindFor } from "./match-alert";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

const initial: SearchState = { status: "idle" };

export function SearchPanel({ quota }: { quota: number }) {
  const [state, dispatch, pending] = useActionState(searchAction, initial);
  const [advanced, setAdvanced] = useState(false);
  const serialRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.at && state.status === "success") resultsRef.current?.focus({ preventScroll: true });
  }, [state.at, state.status]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    fd.set("mode", advanced ? "advanced" : "serial");
    startTransition(() => dispatch(fd));
  };

  const results = state.results ?? [];

  return (
    <div>
      <form onSubmit={onSubmit} className="border border-line bg-paper p-6 shadow-[var(--shadow-card)] md:p-10" role="search">
        {!advanced ? (
          <div>
            <label htmlFor="serial" className="eyebrow">
              Numéro de série
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                ref={serialRef}
                id="serial"
                name="serial"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={64}
                placeholder="ex. 7F3K2291"
                className="serial h-16 min-w-0 flex-1 border border-line-strong bg-ivory px-5 text-2xl tracking-[0.12em] text-ink placeholder:text-line-strong focus:border-ink focus:outline-none md:text-3xl"
              />
              <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "h-16 px-9 text-base")}>
                {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Search className="size-5" aria-hidden />}
                Vérifier
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Recherche avancée</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input name="brand" placeholder="Marque" aria-label="Marque" maxLength={80} />
              <Input name="model" placeholder="Modèle" aria-label="Modèle" maxLength={120} />
              <Input name="reference" placeholder="Référence" aria-label="Référence" className="serial" maxLength={64} />
              <Input name="serial" placeholder="N° de série (facultatif)" aria-label="Numéro de série" className="serial" maxLength={64} />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-smoke">Indiquez une référence, ou une marque et un modèle. Résultats limités à 10.</p>
              <button type="submit" disabled={pending} className={buttonClasses("primary", "md")}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
                Rechercher
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-smoke">
          <button
            type="button"
            onClick={() => {
              setAdvanced((v) => !v);
              if (advanced) setTimeout(() => serialRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-2 text-slate hover:text-ink"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            {advanced ? "Recherche par numéro de série" : "Recherche avancée (marque, modèle, référence)"}
          </button>
          <span>
            Chaque recherche est journalisée · {state.remainingToday ?? quota} recherche(s) restante(s) aujourd'hui
          </span>
        </div>
      </form>

      <div ref={resultsRef} tabIndex={-1} aria-live="polite" className="mt-10 outline-none">
        {state.status === "error" ? (
          <div role="alert" className="border-l-2 border-alert bg-alert-soft px-5 py-4 text-sm text-alert">
            {state.error}
          </div>
        ) : null}

        {state.status === "success" ? (
          <div className="space-y-6">
            <MatchAlert kind={alertKindFor(results.map((r) => r.status))} />
            {state.truncated ? (
              <p className="text-sm text-warn">Plus de 10 déclarations correspondent : affinez votre recherche.</p>
            ) : null}
            {results.length ? (
              <ul className="grid gap-4">
                {results.map((r) => (
                  <li key={r.publicRef}>
                    <Link
                      href={`/pro/declarations/${r.publicRef}`}
                      className="group grid gap-5 border border-line bg-paper p-4 transition-shadow hover:shadow-[var(--shadow-card)] sm:grid-cols-[140px_1fr_auto] sm:items-center sm:p-5"
                    >
                      <WatchImage imageId={r.imageIds[0]} alt={`${r.brand} ${r.model}`} className="aspect-square w-full sm:w-[140px]" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ReportStatusBadge status={r.status} />
                          {r.isDemo ? <DemoBadge /> : null}
                        </div>
                        <p className="eyebrow mt-3">{r.brand}</p>
                        <p className="font-display text-2xl leading-tight text-ink">{r.model}</p>
                        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate">
                          {r.reference ? (
                            <div>
                              <dt className="sr-only">Référence</dt>
                              <dd className="serial">Réf. {r.reference}</dd>
                            </div>
                          ) : null}
                          {r.serial ? (
                            <div>
                              <dt className="sr-only">Numéro de série</dt>
                              <dd className={cn("serial", r.serialMasked && "text-smoke")}>N° {r.serial}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="sr-only">Signalement</dt>
                            <dd>Signalée en {formatMonth(r.reportedAt)}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                        <span className="serial text-xs text-smoke">{r.publicRef}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                          Voir la fiche <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
