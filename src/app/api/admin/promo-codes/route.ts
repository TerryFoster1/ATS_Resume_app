import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/adminAccess";
import { createPromoCode, listPromoCodes, setPromoCodeActive } from "@/lib/promoCodes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
  action: z.literal("create"),
  code: z.string().trim().min(3).max(40),
  description: z.string().trim().max(240).optional(),
  creditAmount: z.coerce.number().int().min(0).max(500),
  freeBetaAccess: z.boolean().optional(),
  expiresAt: z.string().trim().max(80).optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(10000).optional()
});

const ActiveBody = z.object({
  action: z.literal("setActive"),
  id: z.string().uuid(),
  active: z.boolean()
});

const Body = z.discriminatedUnion("action", [CreateBody, ActiveBody]);

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    return NextResponse.json(await listPromoCodes(), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[admin-promo-codes] List failed", { error });
    return NextResponse.json({ error: "Could not load promo codes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid promo code payload." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "create") {
      await createPromoCode({
        code: parsed.data.code,
        description: parsed.data.description,
        creditAmount: parsed.data.creditAmount,
        freeBetaAccess: parsed.data.freeBetaAccess,
        expiresAt: parsed.data.expiresAt,
        maxRedemptions: parsed.data.maxRedemptions,
        createdBy: access.userId
      });
    } else {
      await setPromoCodeActive(parsed.data.id, parsed.data.active);
    }
    return NextResponse.json(await listPromoCodes(), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[admin-promo-codes] Mutation failed", { error });
    return NextResponse.json({ error: "Could not update promo codes." }, { status: 500 });
  }
}

async function requireAdmin(): Promise<{ userId: string } | { response: NextResponse }> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "Auth is not configured." }, { status: 503 }) };
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  if (!isAdminEmail(user.email)) {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { userId: user.id };
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" };
}
