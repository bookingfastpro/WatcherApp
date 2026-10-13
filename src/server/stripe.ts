import "server-only";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { audit } from "./audit";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY manquante).");
  client ??= new Stripe(key, { appInfo: { name: "Watcher" } });
  return client;
}

const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  unpaid: "UNPAID",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  paused: "PAUSED",
};

function toDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

/**
 * Synchronise un abonnement Stripe dans notre base. Stripe reste la source de vérité ;
 * notre copie sert au contrôle d'accès (rapide, sans appel réseau à chaque recherche).
 */
export async function syncStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const profile = await db.professionalProfile.findUnique({ where: { stripeCustomerId: customerId } });
  if (!profile) {
    console.warn("[stripe] abonnement pour un client inconnu", customerId, sub.id);
    return;
  }
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan = priceId ? await db.plan.findUnique({ where: { stripePriceId: priceId } }) : null;

  const data = {
    professionalProfileId: profile.id,
    planId: plan?.id ?? null,
    source: "STRIPE" as const,
    stripePriceId: priceId,
    status: STATUS_MAP[sub.status] ?? "INCOMPLETE",
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: toDate(sub.canceled_at),
  };

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: { ...data, stripeSubscriptionId: sub.id },
    update: data,
  });

  await audit({
    category: "BILLING",
    action: "subscription.synced",
    targetType: "ProfessionalProfile",
    targetId: profile.id,
    metadata: { stripeSubscriptionId: sub.id, status: sub.status, priceId },
  });
}
