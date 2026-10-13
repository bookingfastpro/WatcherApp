import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { stripe, syncStripeSubscription } from "@/server/stripe";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe — signature vérifiée, traitement idempotent (table stripe_events).
 * Événements à activer dans le dashboard Stripe :
 *   checkout.session.completed, customer.subscription.created,
 *   customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
 */
export async function POST(req: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !env().STRIPE_SECRET_KEY) return new Response("Stripe non configuré", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    await audit({ category: "SECURITY", action: "stripe.webhook_invalid_signature" });
    return new Response("Signature invalide", { status: 400 });
  }

  // Idempotence : un événement déjà traité est ignoré.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return Response.json({ received: true, duplicate: true });
    }
    throw e;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncStripeSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await audit({
          category: "BILLING",
          action: "billing.payment_failed",
          metadata: { invoiceId: invoice.id ?? null, customer: typeof invoice.customer === "string" ? invoice.customer : null },
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // En cas d'échec, on retire la marque d'idempotence pour laisser Stripe réessayer.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    console.error("[stripe] échec du traitement", event.type, error);
    return new Response("Erreur de traitement", { status: 500 });
  }

  return Response.json({ received: true });
}
