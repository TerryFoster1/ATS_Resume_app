import { NextResponse, type NextRequest } from "next/server";
import {
  CANONICAL_APP_HOST,
  CANONICAL_APP_ORIGIN,
  isLocalHost,
  isVercelDeploymentHost
} from "@/lib/canonicalUrl";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0];
  if (!host || !shouldCanonicalizeHost(host)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.host = CANONICAL_APP_HOST;
  url.port = "";
  return NextResponse.redirect(url, 302);
}

function shouldCanonicalizeHost(host: string) {
  if (host === CANONICAL_APP_HOST) return false;
  if (isLocalHost(host)) return false;
  if (host === "careerladder.ca") return true;
  return isVercelDeploymentHost(host);
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

export { CANONICAL_APP_ORIGIN as CANONICAL_ORIGIN };
