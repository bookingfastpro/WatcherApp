import type { Partner } from "@prisma/client";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form-fields";
import { PARTNER_CRITERIA, parsePartnerCriteria } from "@/lib/partner-criteria";
import { COUNTRIES } from "@/lib/countries";
import { PARTNER_TIER_LABEL } from "@/lib/labels";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function PartnerForm({ action, partner }: { action: Action; partner?: Partner }) {
  const criteria = parsePartnerCriteria(partner?.verificationCriteria);
  return (
    <ActionForm action={action} className="grid gap-12">
      <Fieldset legend="Présentation publique">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom" name="name" required>
            <Input id="name" name="name" defaultValue={partner?.name} required maxLength={120} />
          </Field>
          <Field label="Identifiant d'URL (slug)" name="slug" required hint="ex. maison-dupont-paris">
            <Input id="slug" name="slug" defaultValue={partner?.slug} required maxLength={80} className="serial" />
          </Field>
          <Field label="Ville" name="city" required>
            <Input id="city" name="city" defaultValue={partner?.city} required />
          </Field>
          <Field label="Pays" name="country" required>
            <Select id="country" name="country" defaultValue={partner?.country ?? "FR"}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Spécialités" name="specialties" hint="Séparées par des virgules (8 max). ex. Montres vintage, Expertise, Restauration">
          <Input id="specialties" name="specialties" defaultValue={partner?.specialties.join(", ")} />
        </Field>
        <Field label="Présentation courte" name="shortDescription" required hint="280 caractères max — affichée sur la carte.">
          <Textarea id="shortDescription" name="shortDescription" rows={2} maxLength={280} defaultValue={partner?.shortDescription} />
        </Field>
        <Field label="Description détaillée" name="description">
          <Textarea id="description" name="description" rows={6} maxLength={5000} defaultValue={partner?.description ?? ""} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Site internet" name="website">
            <Input id="website" name="website" type="url" placeholder="https://" defaultValue={partner?.website ?? ""} />
          </Field>
          <Field label="Instagram" name="instagram">
            <Input id="instagram" name="instagram" type="url" placeholder="https://" defaultValue={partner?.instagram ?? ""} />
          </Field>
          <Field label="Facebook" name="facebook">
            <Input id="facebook" name="facebook" type="url" placeholder="https://" defaultValue={partner?.facebook ?? ""} />
          </Field>
          <Field label="LinkedIn" name="linkedin">
            <Input id="linkedin" name="linkedin" type="url" placeholder="https://" defaultValue={partner?.linkedin ?? ""} />
          </Field>
        </div>
        <Field label="Logo" name="logo" hint="JPEG, PNG ou WebP. Remplace le logo actuel.">
          <Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2.5 file:mr-3 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm" />
        </Field>
        <Checkbox name="isPublished" defaultChecked={partner?.isPublished}>
          Publier sur la page « Revendeurs de confiance »
        </Checkbox>
      </Fieldset>

      <Fieldset legend="Vérification" description="Le badge « Partenaire vérifié » n'est accordé que si tous les critères obligatoires sont remplis (contrôle serveur).">
        <div className="grid gap-3 border border-line bg-paper p-5">
          {PARTNER_CRITERIA.map((c) => (
            <Checkbox key={c.key} name={`criteria.${c.key}`} defaultChecked={criteria[c.key]}>
              {c.label} {c.required ? <span className="text-xs text-smoke">(obligatoire)</span> : null}
            </Checkbox>
          ))}
        </div>
        <Field label="Notes de vérification (internes)" name="verificationNotes">
          <Textarea id="verificationNotes" name="verificationNotes" rows={3} maxLength={3000} defaultValue={partner?.verificationNotes ?? ""} />
        </Field>
        <Checkbox name="wantVerified" defaultChecked={partner?.verified}>
          Attribuer le badge « Partenaire vérifié »
        </Checkbox>
      </Fieldset>

      <Fieldset legend="Visibilité commerciale" description="Indépendante de la vérification. Une mise en avant est signalée publiquement comme telle.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Niveau de partenariat" name="tier">
            <Select id="tier" name="tier" defaultValue={partner?.tier ?? "STANDARD"}>
              {Object.entries(PARTNER_TIER_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordre d'affichage" name="sortOrder" hint="Plus petit = affiché en premier.">
            <Input id="sortOrder" name="sortOrder" type="number" defaultValue={partner?.sortOrder ?? 0} />
          </Field>
        </div>
        <Checkbox name="isSponsored" defaultChecked={partner?.isSponsored}>
          Mise en avant sponsorisée (libellé « Mise en avant »)
        </Checkbox>
      </Fieldset>

      <div className="border-t border-line pt-8">
        <SubmitButton size="lg">{partner ? "Enregistrer" : "Créer le partenaire"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
