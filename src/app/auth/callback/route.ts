import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/accountStorage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const canonicalOrigin = getCanonicalOrigin(url);
  const next = normalizeNextPath(url.searchParams.get("next"), canonicalOrigin);
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

  return NextResponse.redirect(new URL(next, canonicalOrigin));
}

function getCanonicalOrigin(url: URL) {
  if (url.hostname.endsWith(".vercel.app") && url.hostname !== "ats-resume-app-sage.vercel.app") {
    return "https://ats-resume-app-sage.vercel.app";
  }
  return url.origin;
}

function normalizeNextPath(next: string | null, currentOrigin: string) {
  if (!next) return "/dashboard";
  try {
    const parsed = new URL(next, currentOrigin);
    const currentHost = new URL(currentOrigin).host;
    const isSameHost = parsed.host === currentHost;
    const isVercelDeployment = parsed.hostname.endsWith(".vercel.app");
    if (!isSameHost && !isVercelDeployment) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
  } catch {
    return next.startsWith("/") ? next : "/dashboard";
  }
}
