"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { audit } from "../audit";
import { appUrl, stripeEnabled } from "../env";
import { requireProArea } from "../auth/guards";
import { stripe } from "../stripe";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { fail, type ActionState } from "@/lib/action-state";

async function ensureCustomer(profileId: string, email: string, companyName: string): Promise<string> {
  const profile = await db.professionalProfile.findUniqueOrThrow({ where: { id: profileId } });
  if (profile.stripeCustomerId) return profile.stripeCustomerId;
  const customer = await stripe().customers.create({
    email,
    name: companyName,
    metadata: { professionalProfileId: profileId },
  });
  // updateMany conditionnel : évite d'écraser un client créé en parallèle.
  const r = await db.professionalProfile.updateMany({
    where: { id: profileId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (r.count === 0) {
    const fresh = await db.professionalProfile.findUniqueOrThrow({ where: { id: profileId } });
    return fresh.stripeCustomerId!;
  }
  return customer.id;
}

/** Démarre un Stripe Checkout pour l'offre choisie (réservé aux professionnels validés). */
export async function startCheckout(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProArea();
  const profile = user.professionalProfile;
  if (!profile || user.role !== "PROFESSIONAL") return fail("Réservé aux comptes professionnels.");
  if (profile.verificationStatus !== "APPROVED") return fail("Votre compte doit être validé avant de souscrire.");
  if (!stripeEnabled()) return fail("Le paiement en ligne n'est pas encore configuré. Contactez-nous.");
  if (!(await rateLimit(`checkout:${user.id}`, 10, 3600)).ok) return fail(RATE_LIMIT_MESSAGE);

  const planId = String(formData.get("planId") ?? "");
  const plan = await db.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan?.stripePriceId) return fail("Cette offre n'est pas disponible.");

  const active = await db.subscription.findFirst({
    where: { professionalProfileId: profile.id, source: "STRIPE", status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
  });
  if (active) return fail("Vous avez déjà un abonnement. Utilisez « Gérer mon abonnement » pour changer d'offre.");

  const customerId = await ensureCustomer(profile.id, user.email, profile.companyName);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: profile.id,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    subscription_data: { metadata: { professionalProfileId: profile.id, planCode: plan.code } },
    success_url: appUrl("/pro/abonnement?checkout=success"),
    cancel_url: appUrl("/pro/abonnement?checkout=cancel"),
    locale: "fr",
  });
  await audit({ category: "BILLING", action: "billing.checkout_started", actor: { id: user.id, role: user.role }, targetType: "Plan", targetId: plan.id });
  if (!session.url) return fail("Impossible d'ouvrir la page de paiement.");
  redirect(session.url);
}

/** Ouvre le Stripe Customer Portal (moyen de paiement, factures, changement d'offre, résiliation). */
export async function openBillingPortal(_: ActionState, _formData: FormData): Promise<ActionState> {
  const { user } = await requireProArea();
  const customerId = user.professionalProfile?.stripeCustomerId;
  if (!customerId) return fail("Aucun abonnement Stripe associé à ce compte.");
  if (!stripeEnabled()) return fail("Le paiement en ligne n'est pas configuré.");
  const portal = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl("/pro/abonnement"),
    locale: "fr",
  });
  await audit({ category: "BILLING", action: "billing.portal_opened", actor: { id: user.id, role: user.role } });
  redirect(portal.url);
}
