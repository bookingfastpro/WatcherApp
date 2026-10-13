import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import type Stripe from "stripe";
import { db } from "@/server/db";
import { requireProArea } from "@/server/auth/guards";
import { stripeEnabled } from "@/server/env";
import { stripe } from "@/server/stripe";
import { openBillingPortal, startCheckout } from "@/server/actions/billing";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge, Card, CardHeader, DefinitionList, Notice, PageHeader, Table } from "@/components/ui/primitives";
import { PlanCard } from "@/components/pro/plan-card";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/labels";
import { formatDate, formatPrice } from "@/lib/format";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Abonnement" };

async function loadInvoices(customerId: string | null | undefined): Promise<Stripe.Invoice[] | null> {
  if (!customerId || !stripeEnabled()) return null;
  try {
    const list = await stripe().invoices.list({ customer: customerId, limit: 12 });
    return list.data;
  } catch (e) {
    console.error("[stripe] factures", e);
    return null;
  }
}

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, access } = await requireProArea();
  const sp = await searchParams;
  const profile = user.professionalProfile;

  const [subscriptions, plans, invoices] = await Promise.all([
    profile
      ? db.subscription.findMany({
          where: { professionalProfileId: profile.id },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.plan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    loadInvoices(profile?.stripeCustomerId),
  ]);

  const current = subscriptions.find((s) => ["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID"].includes(s.status)) ?? subscriptions[0];
  const hasLiveStripe = subscriptions.some((s) => s.source === "STRIPE" && ["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID"].includes(s.status));
  const approved = profile?.verificationStatus === "APPROVED";

  return (
    <>
      <PageHeader eyebrow="Facturation" title="Abonnement" description="Gérez votre offre, vos moyens de paiement et vos factures." />

      {param(sp.checkout) === "success" ? (
        <Notice tone="ok" title="Paiement confirmé" className="mb-8">
          Votre abonnement sera actif dans quelques instants (confirmation reçue de Stripe). Actualisez la page si nécessaire.
        </Notice>
      ) : null}
      {param(sp.checkout) === "cancel" ? <Notice className="mb-8">Paiement annulé. Aucun montant n'a été débité.</Notice> : null}
      {!approved && user.role === "PROFESSIONAL" ? (
        <Notice tone="warn" className="mb-8">
          La souscription sera possible dès la validation de votre compte professionnel par notre équipe.
        </Notice>
      ) : null}

      <div className="grid gap-8">
        <Card>
          <CardHeader
            title="Offre actuelle"
            action={
              profile?.stripeCustomerId && stripeEnabled() ? (
                <ActionForm action={openBillingPortal} showInlineError={false}>
                  <SubmitButton variant="secondary" size="sm" pendingLabel="Ouverture…">
                    Gérer mon abonnement <ExternalLink className="size-3.5" aria-hidden />
                  </SubmitButton>
                </ActionForm>
              ) : null
            }
          />
          <div className="px-6 py-2">
            {current ? (
              <DefinitionList
                items={[
                  { label: "Offre", value: current.plan?.name ?? (current.source === "MANUAL" ? "Accès accordé par la plateforme" : "—") },
                  {
                    label: "Statut",
                    value: (
                      <Badge tone={access.allowed ? "ok" : "alert"}>{SUBSCRIPTION_STATUS_LABEL[current.status]}</Badge>
                    ),
                  },
                  {
                    label: current.cancelAtPeriodEnd ? "Fin de l'abonnement" : "Prochaine échéance",
                    value: formatDate(current.currentPeriodEnd),
                  },
                  { label: "Mode", value: current.source === "STRIPE" ? "Paiement en ligne (Stripe)" : "Accès manuel" },
                  ...(current.note ? [{ label: "Note", value: current.note }] : []),
                ]}
              />
            ) : (
              <p className="py-4 text-sm text-slate">Aucun abonnement pour le moment.</p>
            )}
          </div>
        </Card>

        {!hasLiveStripe && user.role === "PROFESSIONAL" ? (
          <section>
            <h2 className="mb-6 font-display text-3xl text-ink">Choisir une offre</h2>
            {!stripeEnabled() ? (
              <Notice tone="warn" className="mb-6">
                Le paiement en ligne n'est pas encore activé sur cette instance (STRIPE_SECRET_KEY non configurée).
              </Notice>
            ) : null}
            {plans.length === 0 ? (
              <p className="text-sm text-slate">Aucune offre n'est disponible pour le moment.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {plans.map((plan, i) => (
                  <PlanCard key={plan.id} plan={plan} highlighted={i === plans.length - 1 && plans.length > 1}>
                    <ActionForm action={startCheckout} showInlineError={false}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <SubmitButton
                        variant={i === plans.length - 1 && plans.length > 1 ? "light" : "primary"}
                        className="w-full"
                        pendingLabel="Redirection vers le paiement…"
                      >
                        {approved && plan.stripePriceId && stripeEnabled() ? "Souscrire" : "Indisponible"}
                      </SubmitButton>
                    </ActionForm>
                  </PlanCard>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-smoke">Paiement sécurisé par Stripe. Résiliable à tout moment depuis cet espace.</p>
          </section>
        ) : null}

        <Card>
          <CardHeader title="Factures" />
          {invoices && invoices.length ? (
            <Table className="border-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Numéro</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{formatDate(new Date(inv.created * 1000))}</td>
                    <td className="serial text-[13px]">{inv.number ?? "—"}</td>
                    <td>{formatPrice(inv.total, inv.currency.toUpperCase())}</td>
                    <td>
                      <Badge tone={inv.status === "paid" ? "ok" : inv.status === "open" ? "warn" : "muted"}>
                        {inv.status === "paid" ? "Payée" : inv.status === "open" ? "À régler" : inv.status ?? "—"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {inv.hosted_invoice_url ? (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-2">
                          Consulter
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="px-6 py-5 text-sm text-slate">Aucune facture disponible.</p>
          )}
        </Card>
      </div>
    </>
  );
}
