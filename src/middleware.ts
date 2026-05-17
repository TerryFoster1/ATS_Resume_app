import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "ats-resume-app-sage.vercel.app";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0];
  if (!host || !shouldCanonicalizeHost(host)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.host = CANONICAL_HOST;
  return NextResponse.redirect(url, 302);
}

function shouldCanonicalizeHost(host: string) {
  if (host === CANONICAL_HOST) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;

  return (
    host.endsWith(".vercel.app") &&
    (host.startsWith("ats-resume-") ||
      host.startsWith("ats-resume-app-") ||
      host.includes("ats-resume-app"))
  );
}

export const config = {
  matcher: [
    /*
     * Canonicalize app/page/API requests from immutable Vercel deployment
     * hosts. Static asset requests can stay on their deployment URL.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};

export { CANONICAL_ORIGIN };
