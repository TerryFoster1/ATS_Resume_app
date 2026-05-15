import { NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/accountStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ signedIn: false, credits: 0 }, { headers: noStoreHeaders() });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ signedIn: false, credits: 0 }, { headers: noStoreHeaders() });
  }
  if (user.is_anonymous === true || !user.email) {
    console.log("[account-status] Anonymous Supabase user treated as signed out", {
      userId: user.id
    });
    return NextResponse.json({ signedIn: false, credits: 0 }, { headers: noStoreHeaders() });
  }

  const credits = await getCreditBalance(user.id);
  console.log("[account-status] Returning credit balance", {
    userId: user.id,
    credits
  });
  return NextResponse.json({
    signedIn: true,
    credits,
    email: user.email ?? null
  }, { headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0"
  };
}
