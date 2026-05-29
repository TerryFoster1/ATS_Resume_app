import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreditBalance } from "@/lib/accountStorage";
import { redeemPromoCode } from "@/lib/promoCodes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({
  code: z.string().trim().min(2).max(80)
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid promo code." }, { status: 400 });
  }

  try {
    const result = await redeemPromoCode(user.id, parsed.data.code);
    const credits = await getCreditBalance(user.id);
    return NextResponse.json({ ...result, credits }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[promo-code] Redemption failed", { userId: user.id, error });
    return NextResponse.json({ error: "Could not redeem that promo code." }, { status: 500 });
  }
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" };
}
