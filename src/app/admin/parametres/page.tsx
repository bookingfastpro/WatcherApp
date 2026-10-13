import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { env, stripeEnabled } from "@/server/env";
import { runMaintenanceNow, updateSettings } from "@/server/actions/admin/platform";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Fieldset, Input, Select } from "@/components/ui/form-fields";
import { Badge, Card, CardHeader, DefinitionList, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Paramètres" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  const e = env();

  return (
    <>
      <PageHeader eyebrow="Plateforme" title="Paramètres" />
      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Politique d'accès et de sécurité" />
          <ActionForm action={updateSettings} className="grid gap-10 p-6">
            <Fieldset legend="Abonnements">
              <Field label="Délai de grâce (jours)" name="graceDays" hint="Accès maintenu après une échéance impayée, avant blocage automatique.">
                <Input id="graceDays" name="graceDays" type="number" min={0} max={60} defaultValue={s.graceDays} />
              </Field>
            </Fieldset>
            <Fieldset legend="Recherche professionnelle">
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Quota / jour / pro" name="searchDailyQuota">
                  <Input id="searchDailyQuota" name="searchDailyQuota" type="number" min={1} defaultValue={s.searchDailyQuota} />
                </Field>
                <Field label="Limite / minute" name="searchPerMinute">
                  <Input id="searchPerMinute" name="searchPerMinute" type="number" min={1} defaultValue={s.searchPerMinute} />
                </Field>
                <Field label="Seuil d'anomalie / heure" name="anomalyHourlyThreshold">
                  <Input id="anomalyHourlyThreshold" name="anomalyHourlyThreshold" type="number" min={5} defaultValue={s.anomalyHourlyThreshold} />
                </Field>
              </div>
              <Field label="Affichage du numéro de série (recherche avancée)" name="serialDisplayPolicy" hint="La recherche par numéro exact affiche toujours le numéro saisi.">
                <Select id="serialDisplayPolicy" name="serialDisplayPolicy" defaultValue={s.serialDisplayPolicy}>
                  <option value="MASKED_IN_ADVANCED">Masqué (derniers caractères uniquement)</option>
                  <option value="FULL">Complet</option>
                </Select>
              </Field>
              <Checkbox name="includeUnverifiedReports" defaultChecked={s.includeUnverifiedReports}>
                Inclure les déclarations en cours de vérification (signalées comme telles)
              </Checkbox>
            </Fieldset>
            <Fieldset legend="Conservation des données (RGPD)">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Historique des recherches (jours)" name="searchLogRetentionDays">
                  <Input id="searchLogRetentionDays" name="searchLogRetentionDays" type="number" min={30} defaultValue={s.searchLogRetentionDays} />
                </Field>
                <Field label="Journal d'audit (jours)" name="auditLogRetentionDays">
                  <Input id="auditLogRetentionDays" name="auditLogRetentionDays" type="number" min={180} defaultValue={s.auditLogRetentionDays} />
                </Field>
              </div>
            </Fieldset>
            <Fieldset legend="Page d'accueil">
              <Checkbox name="publicStatsEnabled" defaultChecked={s.publicStatsEnabled}>
                Publier les statistiques (données réelles, hors démonstration)
              </Checkbox>
              <Field label="Seuil minimal de déclarations vérifiées" name="publicStatsMinimum">
                <Input id="publicStatsMinimum" name="publicStatsMinimum" type="number" min={0} defaultValue={s.publicStatsMinimum} />
              </Field>
              <Field label="Email de contact public" name="contactEmail">
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={s.contactEmail} />
              </Field>
            </Fieldset>
            <div>
              <SubmitButton size="lg">Enregistrer les paramètres</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <div className="space-y-8">
          <Card>
            <CardHeader title="Configuration technique" description="Lecture seule — définie par les variables d'environnement." />
            <div className="px-6 py-2">
              <DefinitionList
                items={[
                  { label: "URL publique", value: e.APP_URL },
                  { label: "Stockage", value: e.STORAGE_DRIVER === "s3" ? `S3 (${e.S3_BUCKET})` : "Disque local" },
                  { label: "Emails", value: e.SMTP_HOST ? <Badge tone="ok">SMTP configuré</Badge> : <Badge tone="warn">Logs serveur (dev)</Badge> },
                  { label: "Stripe", value: stripeEnabled() ? <Badge tone="ok">{e.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "Production" : "Test"}</Badge> : <Badge tone="warn">Non configuré</Badge> },
                  { label: "Webhook Stripe", value: e.STRIPE_WEBHOOK_SECRET ? <Badge tone="ok">Secret défini</Badge> : <Badge tone="warn">Absent</Badge> },
                  { label: "Tâche planifiée", value: e.CRON_SECRET ? <Badge tone="ok">CRON_SECRET défini</Badge> : <Badge tone="warn">Absent</Badge> },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Maintenance" description="Purge des sessions expirées et des journaux arrivés en fin de conservation." />
            <ActionForm action={runMaintenanceNow} className="p-6" confirm={{ title: "Lancer la purge maintenant ?", description: "Les données au-delà des durées de conservation seront définitivement supprimées." }}>
              <SubmitButton variant="secondary">Lancer la purge</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
