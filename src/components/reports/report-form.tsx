"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Eye } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { useManualAction } from "@/components/ui/action-form";
import { COUNTRIES } from "@/lib/countries";
import { MAX_PHOTOS_PER_REPORT } from "@/lib/file-signature";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { FieldErrorsContext } from "@/components/ui/form-context";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-fields";

export type ReportDefaults = {
  brand?: string;
  model?: string;
  reference?: string | null;
  serialNumber?: string | null;
  yearApprox?: number | null;
  caseMaterial?: string | null;
  caseSizeMm?: number | null;
  dialColor?: string | null;
  strap?: string | null;
  distinctiveMarks?: string | null;
  theftDate?: string;
  theftCity?: string;
  theftCountry?: string;
  circumstances?: string | null;
  privateDescription?: string | null;
  policeReportFiled?: boolean;
  policeReportNumber?: string | null;
  policeService?: string | null;
};

type Mode = "create" | "edit";

const STEPS = [
  { title: "La montre", fields: ["brand", "model", "reference", "serialNumber", "yearApprox", "caseMaterial", "caseSizeMm", "dialColor", "strap"] },
  { title: "Signes & photos", fields: ["distinctiveMarks", "privateDescription", "photos"] },
  { title: "Le vol", fields: ["theftDate", "theftCity", "theftCountry", "circumstances"] },
  { title: "Plainte & justificatifs", fields: ["policeReportFiled", "policeReportNumber", "policeService", "policeReport", "invoice", "otherDocuments"] },
  { title: "Validation", fields: ["certify"] },
];

function Visibility({ pro }: { pro: boolean }) {
  return pro ? (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ok">
      <Eye className="size-3.5" aria-hidden /> Visible des professionnels vérifiés
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate">
      <Lock className="size-3.5" aria-hidden /> Confidentiel — équipe de vérification uniquement
    </span>
  );
}

function SectionTitle({ title, pro, children }: { title: string; pro: boolean; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h2 className="font-display text-3xl text-ink">{title}</h2>
        {children ? <p className="mt-1 text-sm text-slate">{children}</p> : null}
      </div>
      <Visibility pro={pro} />
    </div>
  );
}

function PhotoPicker() {
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);
  return (
    <Field
      label="Photos de la montre"
      name="photos"
      hint={`Jusqu'à ${MAX_PHOTOS_PER_REPORT} photos (JPEG, PNG, WebP — 10 Mo max chacune). Les métadonnées (dont la localisation GPS) sont automatiquement supprimées.`}
    >
      <Input
        id="photos"
        name="photos"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="h-auto py-2.5 file:mr-4 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          if (files.length > MAX_PHOTOS_PER_REPORT) {
            toast.error(`${MAX_PHOTOS_PER_REPORT} photos maximum.`);
            e.currentTarget.value = "";
            setPreviews([]);
            return;
          }
          setPreviews(files.map((f) => URL.createObjectURL(f)));
        }}
      />
      {previews.length ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {previews.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="aspect-square w-full border border-line object-cover" />
          ))}
        </div>
      ) : null}
    </Field>
  );
}

function FileInput({ name, multiple }: { name: string; multiple?: boolean }) {
  return (
    <Input
      id={name}
      name={name}
      type="file"
      multiple={multiple}
      accept="application/pdf,image/jpeg,image/png,image/webp"
      className="h-auto py-2.5 file:mr-4 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
    />
  );
}

function SubmitReport({ mode, pending }: { mode: Mode; pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className={buttonClasses("primary", "lg")}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {pending ? "Envoi sécurisé en cours…" : mode === "create" ? "Enregistrer la déclaration" : "Enregistrer les modifications"}
    </button>
  );
}

export function ReportForm({
  mode,
  action,
  defaults = {},
}: {
  mode: Mode;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: ReportDefaults;
}) {
  const { state, isPending, submit } = useManualAction(action);
  const formRef = useRef<HTMLFormElement>(null);
  const wizard = mode === "create";
  const steps = wizard ? STEPS : STEPS.slice(0, 4);
  const [step, setStep] = useState(0);
  const [policeFiled, setPoliceFiled] = useState<boolean>(defaults.policeReportFiled ?? true);
  const [summary, setSummary] = useState<Record<string, string>>({});

  // Erreurs serveur : toast + retour à la première étape concernée.
  useEffect(() => {
    if (!state.at || state.status !== "error") return;
    if (state.message) toast.error(state.message);
    const keys = Object.keys(state.fieldErrors ?? {});
    const idx = STEPS.findIndex((s) => s.fields.some((f) => keys.includes(f)));
    if (wizard && idx >= 0) setStep(idx);
  }, [state.at, state.status, state.message, state.fieldErrors, wizard]);

  function validateCurrent(): boolean {
    const section = wizard ? formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`) : formRef.current;
    if (!section) return true;
    const controls = Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const el of controls) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  }

  function go(to: number) {
    if (to > step && !validateCurrent()) return;
    if (to === STEPS.length - 1 && formRef.current) {
      const fd = new FormData(formRef.current);
      const s: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (typeof v === "string") s[k] = v;
      });
      s.photosCount = String(fd.getAll("photos").filter((f) => f instanceof File && f.size > 0).length);
      s.docsCount = String(
        ["policeReport", "invoice", "otherDocuments"].reduce(
          (n, k) => n + fd.getAll(k).filter((f) => f instanceof File && f.size > 0).length,
          0,
        ),
      );
      setSummary(s);
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const show = (i: number) => !wizard || step === i;
  const d = defaults;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FieldErrorsContext.Provider value={state.fieldErrors ?? {}}>
      {wizard ? (
        <ol className="mb-12 grid grid-cols-5 gap-2" aria-label="Étapes de la déclaration">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => (i < step ? go(i) : undefined)}
                disabled={i >= step}
                aria-current={i === step ? "step" : undefined}
                className="group w-full text-left disabled:cursor-default"
              >
                <span className={cn("block h-px w-full transition-colors duration-300", i <= step ? "bg-ink" : "bg-line-strong")} />
                <span className={cn("mt-3 hidden text-[12px] tracking-wide sm:block", i === step ? "text-ink" : "text-smoke")}>
                  <span className="serial mr-1.5">0{i + 1}</span>
                  {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <form
        ref={formRef}
        noValidate
        className={cn(!wizard && "space-y-16")}
        onSubmit={(e) => {
          e.preventDefault();
          if (isPending) return;
          // Sur la dernière étape (ou en édition), validation navigateur des champs visibles.
          if (!validateCurrent()) return;
          submit(e.currentTarget);
        }}
      >
        {/* ── Étape 1 : identification */}
        <section data-step={0} hidden={!show(0)} className="fade-in">
          <SectionTitle title="Identification de la montre" pro>
            Ces informations permettent aux professionnels de reconnaître la montre.
          </SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Marque" name="brand" required>
              <Input id="brand" name="brand" required maxLength={80} defaultValue={d.brand} placeholder="ex. Omega" />
            </Field>
            <Field label="Modèle" name="model" required>
              <Input id="model" name="model" required maxLength={120} defaultValue={d.model} placeholder="ex. Speedmaster Professional" />
            </Field>
            <Field label="Référence" name="reference" hint="Gravée entre les cornes ou indiquée sur la garantie.">
              <Input id="reference" name="reference" maxLength={64} defaultValue={d.reference ?? ""} className="serial" />
            </Field>
            <Field label="Numéro de série" name="serialNumber" hint="Élément le plus déterminant pour une identification formelle.">
              <Input id="serialNumber" name="serialNumber" maxLength={64} defaultValue={d.serialNumber ?? ""} className="serial" />
            </Field>
            <Field label="Année approximative" name="yearApprox">
              <Input id="yearApprox" name="yearApprox" type="number" inputMode="numeric" min={1850} max={new Date().getFullYear()} defaultValue={d.yearApprox ?? ""} />
            </Field>
            <Field label="Matière du boîtier" name="caseMaterial">
              <Input id="caseMaterial" name="caseMaterial" maxLength={80} defaultValue={d.caseMaterial ?? ""} placeholder="ex. Acier, or rose, titane" />
            </Field>
            <Field label="Diamètre (mm)" name="caseSizeMm">
              <Input id="caseSizeMm" name="caseSizeMm" type="number" inputMode="numeric" min={10} max={70} defaultValue={d.caseSizeMm ?? ""} />
            </Field>
            <Field label="Couleur du cadran" name="dialColor">
              <Input id="dialColor" name="dialColor" maxLength={60} defaultValue={d.dialColor ?? ""} />
            </Field>
            <Field label="Bracelet" name="strap" className="sm:col-span-2">
              <Input id="strap" name="strap" maxLength={120} defaultValue={d.strap ?? ""} placeholder="ex. Bracelet acier Oyster, cuir noir, boucle déployante" />
            </Field>
          </div>
        </section>

        {/* ── Étape 2 : signes distinctifs & photos */}
        <section data-step={1} hidden={!show(1)} className="fade-in">
          <SectionTitle title="Signes distinctifs" pro>
            Rayures, gravures, pièces remplacées… N'indiquez aucune donnée personnelle (nom, date de naissance).
          </SectionTitle>
          <div className="grid gap-5">
            <Field label="Signes distinctifs" name="distinctiveMarks">
              <Textarea id="distinctiveMarks" name="distinctiveMarks" maxLength={1000} defaultValue={d.distinctiveMarks ?? ""} />
            </Field>
            {wizard ? <PhotoPicker /> : null}
          </div>
          <div className="mt-12">
            <SectionTitle title="Description complémentaire" pro={false}>
              Tout élément utile à la vérification, qui ne sera pas communiqué aux professionnels.
            </SectionTitle>
            <Field label="Description" name="privateDescription">
              <Textarea id="privateDescription" name="privateDescription" maxLength={3000} defaultValue={d.privateDescription ?? ""} />
            </Field>
          </div>
        </section>

        {/* ── Étape 3 : le vol */}
        <section data-step={2} hidden={!show(2)} className="fade-in">
          <SectionTitle title="Le vol" pro={false}>
            Les professionnels voient uniquement le mois du signalement, jamais la date ni le lieu du vol.
          </SectionTitle>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Date du vol" name="theftDate" required hint="Approximative si nécessaire.">
              <Input id="theftDate" name="theftDate" type="date" required max={today} defaultValue={d.theftDate} />
            </Field>
            <Field label="Ville" name="theftCity" required>
              <Input id="theftCity" name="theftCity" required maxLength={100} defaultValue={d.theftCity} />
            </Field>
            <Field label="Pays" name="theftCountry" required>
              <Select id="theftCountry" name="theftCountry" required defaultValue={d.theftCountry ?? "FR"}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Circonstances (facultatif)" name="circumstances" className="mt-5">
            <Textarea id="circumstances" name="circumstances" maxLength={3000} defaultValue={d.circumstances ?? ""} />
          </Field>
        </section>

        {/* ── Étape 4 : plainte & justificatifs */}
        <section data-step={3} hidden={!show(3)} className="fade-in">
          <SectionTitle title="Dépôt de plainte" pro={false}>
            Une déclaration accompagnée d'un dépôt de plainte est vérifiée en priorité.
          </SectionTitle>
          <fieldset className="grid gap-5">
            <legend className="sr-only">Avez-vous déposé plainte ?</legend>
            <div className="flex flex-wrap gap-3">
              {[
                { v: "yes", l: "J'ai déposé plainte" },
                { v: "no", l: "Pas encore" },
              ].map((o) => (
                <label
                  key={o.v}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors",
                    (o.v === "yes") === policeFiled ? "border-ink bg-paper text-ink" : "border-line-strong text-slate hover:border-slate",
                  )}
                >
                  <input
                    type="radio"
                    name="policeReportFiled"
                    value={o.v}
                    checked={(o.v === "yes") === policeFiled}
                    onChange={() => setPoliceFiled(o.v === "yes")}
                    className="accent-ink"
                  />
                  {o.l}
                </label>
              ))}
            </div>
            {policeFiled ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Numéro / référence du dépôt de plainte" name="policeReportNumber" required>
                  <Input id="policeReportNumber" name="policeReportNumber" required maxLength={80} defaultValue={d.policeReportNumber ?? ""} className="serial" />
                </Field>
                <Field label="Service de police ou gendarmerie" name="policeService">
                  <Input id="policeService" name="policeService" maxLength={160} defaultValue={d.policeService ?? ""} placeholder="ex. Commissariat du 8e arrondissement" />
                </Field>
              </div>
            ) : (
              <p className="border-l-2 border-warn bg-warn-soft px-4 py-3 text-sm text-graphite">
                Nous vous recommandons vivement de déposer plainte : elle est généralement indispensable à la vérification
                et à toute restitution. Vous pourrez ajouter ces informations plus tard.
              </p>
            )}
          </fieldset>

          {wizard ? (
            <div className="mt-12">
              <SectionTitle title="Justificatifs" pro={false}>
                Stockés de manière chiffrée et privée. Ils ne sont jamais accessibles aux professionnels.
              </SectionTitle>
              <div className="grid gap-5">
                <Field label="Copie du dépôt de plainte" name="policeReport" hint="PDF, JPEG, PNG — 15 Mo max.">
                  <FileInput name="policeReport" />
                </Field>
                <Field label="Facture ou preuve d'achat (facultatif)" name="invoice">
                  <FileInput name="invoice" />
                </Field>
                <Field label="Autres justificatifs (certificat, garantie, photos portées…)" name="otherDocuments">
                  <FileInput name="otherDocuments" multiple />
                </Field>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── Étape 5 : récapitulatif */}
        {wizard ? (
          <section data-step={4} hidden={!show(4)} className="fade-in">
            <SectionTitle title="Vérifiez votre déclaration" pro={false} />
            <dl className="grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Montre", `${summary.brand ?? ""} ${summary.model ?? ""}`],
                ["Référence", summary.reference],
                ["Numéro de série", summary.serialNumber],
                ["Date du vol", summary.theftDate ? new Date(summary.theftDate).toLocaleDateString("fr-FR") : ""],
                ["Lieu", [summary.theftCity, COUNTRIES.find((c) => c.code === summary.theftCountry)?.name].filter(Boolean).join(", ")],
                ["Dépôt de plainte", summary.policeReportFiled === "yes" ? `Oui — ${summary.policeReportNumber ?? ""}` : "Non"],
                ["Photos", summary.photosCount],
                ["Justificatifs", summary.docsCount],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-line pb-3">
                  <dt className="text-smoke">{k}</dt>
                  <dd className="mt-1 text-anthracite">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10 border border-line bg-paper p-6">
              <Checkbox name="certify" required>
                Je certifie sur l'honneur être le propriétaire (ou le représentant légal du propriétaire) de cette montre
                et que les informations fournies sont exactes. Je comprends qu'une fausse déclaration peut engager ma responsabilité.
              </Checkbox>
            </div>
          </section>
        ) : null}

        {/* ── Navigation */}
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-8">
          {wizard && step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className={buttonClasses("ghost", "md")}>
              <ArrowLeft className="size-4" aria-hidden /> Retour
            </button>
          ) : (
            <span />
          )}
          {wizard && step < steps.length - 1 ? (
            <button type="button" onClick={() => go(step + 1)} className={buttonClasses("primary", "lg")}>
              Continuer <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : (
            <SubmitReport mode={mode} pending={isPending} />
          )}
        </div>
      </form>
    </FieldErrorsContext.Provider>
  );
}
