import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ensureUserProfile } from "@/lib/accountStorage";
import { CANONICAL_APP_ORIGIN, getCanonicalOriginForHost } from "@/lib/canonicalUrl";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutPack = "5" | "10";

const PRICE_ENV_BY_PACK: Record<CheckoutPack, string> = {
  "5": "STRIPE_PRICE_5_CREDIT_PACK",
  "10": "STRIPE_PRICE_10_CREDIT_PACK"
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pack = parsePack(body);
  if (!pack) {
    return NextResponse.json(
      { error: "Invalid pack. Use \"5\" or \"10\"." },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  console.log("[checkout-create] Auth check", {
    authenticated: Boolean(user),
    userId: user?.id ?? null,
    pack
  });

  if (!user || isAnonymousSupabaseUser(user)) {
    console.warn("[checkout-create] Blocked checkout without authenticated user", {
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      pack
    });
    return NextResponse.json(
      { error: "Sign in required before buying credits." },
      { status: 401 }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceEnvName = PRICE_ENV_BY_PACK[pack];
  const priceId = process.env[priceEnvName];
  const appUrl = getRequestOrigin(request);

  if (!secretKey || !priceId) {
    console.error("[checkout-create] Missing Stripe checkout configuration", {
      pack,
      missing: [
        !secretKey ? "STRIPE_SECRET_KEY" : null,
        !priceId ? priceEnvName : null
      ].filter(Boolean)
    });
    return NextResponse.json(
      {
        error:
          "Stripe checkout is not configured for this deployment. Please contact support."
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);

  let stripeCustomerId: string | undefined;
  await ensureUserProfile({
    userId: user.id,
    email: user.email,
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null
  });
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("[checkout-create] Supabase admin client unavailable. Refusing checkout.");
    return NextResponse.json(
      { error: "Account storage is not configured." },
      { status: 500 }
    );
  }
  const { data: profile } = admin
    ? await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single()
    : { data: null };
  stripeCustomerId = profile?.stripe_customer_id ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    customer_email: stripeCustomerId ? undefined : user.email,
    client_reference_id: user.id,
    metadata: {
      pack,
      userId: user.id
    },
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`
  });

  console.log("[checkout-create] Created Stripe checkout session", {
    userId: user.id,
    pack,
    priceId,
    sessionId: session.id,
    successUrlHost: safeHost(`${appUrl}/checkout/success`),
    cancelUrlHost: safeHost(`${appUrl}/pricing`)
  });

  const { error: purchaseError } = await admin.from("purchases").insert({
    user_id: user.id,
    stripe_checkout_session_id: session.id,
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : stripeCustomerId ?? null,
    pack,
    status: "created"
  });
  if (purchaseError) {
    console.error("[checkout-create] Failed to record purchase session", {
      userId: user.id,
      pack,
      sessionId: session.id,
      error: purchaseError
    });
    return NextResponse.json(
      { error: "Could not record checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}

function parsePack(body: unknown): CheckoutPack | null {
  if (!body || typeof body !== "object" || !("pack" in body)) return null;
  const pack = (body as { pack?: unknown }).pack;
  return pack === "5" || pack === "10" ? pack : null;
}

function isAnonymousSupabaseUser(user: { is_anonymous?: boolean; email?: string | null }) {
  return user.is_anonymous === true || !user.email;
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? new URL(request.url).host).toLowerCase().split(":")[0];
  const currentOrigin = forwardedProto && forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
  const canonicalOrigin = getCanonicalOriginForHost(host, currentOrigin);
  if (canonicalOrigin === CANONICAL_APP_ORIGIN) return canonicalOrigin;
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

function safeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid";
  }
}
