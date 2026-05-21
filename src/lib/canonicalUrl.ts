export const CANONICAL_APP_HOST = "www.careerladder.ca";
export const CANONICAL_APP_ORIGIN = `https://${CANONICAL_APP_HOST}`;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

export function isVercelDeploymentHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host.endsWith(".vercel.app") && /^ats-resume(?:-app)?[-a-z0-9]*\./.test(host);
}

export function getCanonicalOriginForHost(hostname: string, currentOrigin?: string) {
  const host = hostname.toLowerCase();
  if (host === CANONICAL_APP_HOST || host === "careerladder.ca" || isVercelDeploymentHost(host)) {
    return CANONICAL_APP_ORIGIN;
  }
  if (isLocalHost(host) && currentOrigin) {
    return currentOrigin.replace(/\/+$/, "");
  }
  return currentOrigin?.replace(/\/+$/, "") || CANONICAL_APP_ORIGIN;
}

export function normalizeAppReturnPath(value: string | null | undefined, baseOrigin = CANONICAL_APP_ORIGIN) {
  if (!value) return "/dashboard";
  try {
    const parsed = new URL(value, baseOrigin);
    const baseHost = new URL(baseOrigin).hostname.toLowerCase();
    const targetHost = parsed.hostname.toLowerCase();
    const allowed =
      targetHost === baseHost ||
      targetHost === CANONICAL_APP_HOST ||
      targetHost === "careerladder.ca" ||
      isVercelDeploymentHost(targetHost) ||
      (isLocalHost(targetHost) && isLocalHost(baseHost));

    if (!allowed) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }
}

export function normalizeAppUrl(value: string | null | undefined, fallbackPath = "/dashboard") {
  const path = normalizeAppReturnPath(value, CANONICAL_APP_ORIGIN);
  return `${CANONICAL_APP_ORIGIN}${path || fallbackPath}`;
}

export function scrubStaleVercelUrlsFromStorage(storage: Storage) {
  const stalePattern = /ats-resume(?:-app)?[-a-z0-9]*\.vercel\.app/i;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key) continue;
    const value = storage.getItem(key);
    if (!value || !stalePattern.test(value)) continue;
    storage.removeItem(key);
    console.info("[canonical-url] Removed stale Vercel deployment URL from browser storage", {
      key
    });
  }
}
