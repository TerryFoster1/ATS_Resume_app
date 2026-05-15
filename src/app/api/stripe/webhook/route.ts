import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillCreditPurchase } from "@/lib/accountStorage";

export const runtime = "nodejs";

type CreditPack = "5" | "10";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("[stripe-webhook] Missing Stripe webhook configuration.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.warn("[stripe-webhook] Missing Stripe signature header.");
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed.", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  console.log("[stripe-webhook] Received event", {
    id: event.id,
    type: event.type
  });

  if (event.type !== "checkout.session.completed") {
    console.log("[stripe-webhook] Ignored event", {
      id: event.id,
      type: event.type
    });
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.userId;
  const pack = parseCreditPack(session.metadata?.pack);

  if (session.payment_status !== "paid") {
    console.warn("[stripe-webhook] Checkout session completed without paid status", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      userId,
      pack: session.metadata?.pack
    });
    return NextResponse.json({ received: true, pending: true });
  }

  if (!userId || !pack) {
    console.warn("[stripe-webhook] Missing checkout metadata", {
      sessionId: session.id,
      hasUserId: Boolean(userId),
      pack: session.metadata?.pack
    });
    return NextResponse.json({ received: true });
  }

  if (session.client_reference_id && session.client_reference_id !== userId) {
    console.warn("[stripe-webhook] Client reference and metadata user mismatch", {
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
      metadataUserId: userId
    });
    return NextResponse.json({ received: true, mismatch: true });
  }

  try {
    const result = await fulfillCreditPurchase({
      userId,
      pack,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null
    });

    if (result.status === "duplicate") {
      console.log("[stripe-webhook] Duplicate fulfillment skipped", {
        sessionId: session.id,
        userId,
        pack
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log("[stripe-webhook] Fulfilled purchase", {
      sessionId: session.id,
      userId,
      pack,
      credits: result.credits
    });
    return NextResponse.json({ received: true, fulfilled: true });
  } catch (error) {
    console.error("[stripe-webhook] Fulfillment failed", {
      sessionId: session.id,
      userId,
      pack,
      error
    });
    return NextResponse.json({ error: "Webhook fulfillment failed." }, { status: 500 });
  }
}

function parseCreditPack(value: string | undefined): CreditPack | null {
  return value === "5" || value === "10" ? value : null;
}
