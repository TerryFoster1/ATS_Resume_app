import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillCreditPurchase } from "@/lib/accountStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreditPack = "5" | "10";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("[checkout-verify] Missing STRIPE_SECRET_KEY.");
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (user.is_anonymous === true || !user.email) {
    console.warn("[checkout-verify] Blocked verification without full authenticated user", {
      userId: user.id
    });
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId =
    body && typeof body === "object" && "sessionId" in body
      ? (body as { sessionId?: unknown }).sessionId
      : null;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metadataUserId = session.metadata?.userId;
  const referenceUserId = session.client_reference_id;
  const pack = parseCreditPack(session.metadata?.pack);

  console.log("[checkout-verify] Retrieved checkout session", {
    sessionId,
    paymentStatus: session.payment_status,
    userId: user.id,
    metadataUserId,
    referenceUserId,
    pack: session.metadata?.pack
  });

  if (metadataUserId !== user.id || referenceUserId !== user.id || !pack) {
    console.warn("[checkout-verify] Checkout session did not match signed-in user", {
      sessionId,
      userId: user.id,
      metadataUserId,
      referenceUserId,
      pack: session.metadata?.pack
    });
    return NextResponse.json({ error: "Checkout session mismatch." }, { status: 403 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({
      status: "pending",
      paymentStatus: session.payment_status
    });
  }

  try {
    const result = await fulfillCreditPurchase({
      userId: user.id,
      pack,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null
    });

    console.log("[checkout-verify] Fulfillment result", {
      sessionId,
      userId: user.id,
      status: result.status,
      credits: "credits" in result ? result.credits : 0
    });

    return NextResponse.json({ status: result.status, credits: "credits" in result ? result.credits : 0 });
  } catch (error) {
    console.error("[checkout-verify] Fulfillment failed", {
      sessionId,
      userId: user.id,
      error
    });
    return NextResponse.json({ error: "Checkout fulfillment failed." }, { status: 500 });
  }
}

function parseCreditPack(value: string | undefined): CreditPack | null {
  return value === "5" || value === "10" ? value : null;
}
