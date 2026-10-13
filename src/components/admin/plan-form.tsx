import type { Plan } from "@prisma/client";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-fields";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function PlanForm({ action, plan }: { action: Action; plan?: Plan }) {
  return (
    <ActionForm action={action} className="grid gap-5" resetOnSuccess={!plan}>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Nom affiché" name="name" required>
          <Input id={`name-${plan?.id ?? "new"}`} name="name" defaultValue={plan?.name} required />
        </Field>
        <Field label="Code technique" name="code" required>
          <Input id={`code-${plan?.id ?? "new"}`} name="code" defaultValue={plan?.code} required className="serial" />
        </Field>
        <Field label="Périodicité" name="interval">
          <Select id={`interval-${plan?.id ?? "new"}`} name="interval" defaultValue={plan?.interval ?? "MONTH"}>
            <option value="MONTH">Mensuel</option>
            <option value="YEAR">Annuel</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="ID du prix Stripe" name="stripePriceId" hint="price_… (Dashboard Stripe > Produits)" className="sm:col-span-2">
          <Input id={`price-${plan?.id ?? "new"}`} name="stripePriceId" defaultValue={plan?.stripePriceId ?? ""} className="serial" />
        </Field>
        <Field label="Prix affiché HT (€)" name="priceEuros" hint="Vide = « communiqué lors de la validation ».">
          <Input
            id={`eur-${plan?.id ?? "new"}`}
            name="priceEuros"
            inputMode="decimal"
            defaultValue={plan?.priceCents != null ? (plan.priceCents / 100).toFixed(2) : ""}
          />
        </Field>
      </div>
      <Field label="Description" name="description">
        <Input id={`desc-${plan?.id ?? "new"}`} name="description" defaultValue={plan?.description ?? ""} />
      </Field>
      <Field label="Avantages (un par ligne)" name="features">
        <Textarea id={`feat-${plan?.id ?? "new"}`} name="features" rows={3} defaultValue={plan?.features.join("\n")} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Checkbox name="isActive" defaultChecked={plan?.isActive ?? true}>
            Offre active
          </Checkbox>
          <label className="flex items-center gap-2 text-sm text-graphite">
            Ordre
            <Input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="h-9 w-20" />
          </label>
        </div>
        <SubmitButton variant={plan ? "secondary" : "primary"}>{plan ? "Enregistrer" : "Créer l'offre"}</SubmitButton>
      </div>
      <p className="text-xs text-smoke">Le montant réellement facturé est celui du prix Stripe : gardez le prix affiché cohérent.</p>
    </ActionForm>
  );
}
