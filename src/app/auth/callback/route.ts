import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/accountStorage";
import { getCanonicalOriginForHost, normalizeAppReturnPath } from "@/lib/canonicalUrl";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const canonicalOrigin = getCanonicalOriginForHost(url.hostname, url.origin);
  const receivedNext = url.searchParams.get("next");
  const next = normalizeAppReturnPath(receivedNext, canonicalOrigin);
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

  const destination = new URL(next, canonicalOrigin);
  console.info("[auth-callback] Redirect decision", {
    requestHost: url.host,
    receivedNext,
    normalizedNext: next,
    canonicalOrigin,
    finalDestination: destination.toString()
  });
  return NextResponse.redirect(destination);
}
