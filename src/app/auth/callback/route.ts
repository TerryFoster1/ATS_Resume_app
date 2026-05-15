import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/accountStorage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const supabase = createServerSupabaseClient();

  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      await ensureUserProfile({
        userId: user.id,
        email: user.email,
        name:
          typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null
      });
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
