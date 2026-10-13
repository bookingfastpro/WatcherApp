import Link from "next/link";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form-fields";
import { buttonClasses } from "@/components/ui/button";

type SelectFilter = { name: string; label: string; value?: string; options: { value: string; label: string }[] };

/** Barre de filtres en GET (partageable par URL, fonctionne sans JavaScript). */
export function FilterBar({
  basePath,
  q,
  qPlaceholder = "Rechercher…",
  selects = [],
}: {
  basePath: string;
  q?: string;
  qPlaceholder?: string;
  selects?: SelectFilter[];
}) {
  const active = Boolean(q) || selects.some((s) => s.value);
  return (
    <form action={basePath} className="mb-6 flex flex-wrap items-center gap-3" role="search">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-smoke" aria-hidden />
        <Input name="q" defaultValue={q} placeholder={qPlaceholder} aria-label="Recherche" className="pl-10" maxLength={100} />
      </div>
      {selects.map((s) => (
        <div key={s.name} className="w-full sm:w-52">
          <Select name={s.name} defaultValue={s.value ?? ""} aria-label={s.label}>
            <option value="">{s.label} : tous</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
      <button type="submit" className={buttonClasses("primary", "md")}>
        Filtrer
      </button>
      {active ? (
        <Link href={basePath} className="text-sm text-slate underline underline-offset-4 hover:text-ink">
          Réinitialiser
        </Link>
      ) : null}
    </form>
  );
}
