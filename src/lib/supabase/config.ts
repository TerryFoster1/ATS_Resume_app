type SupabaseConfigIssue = {
  code: string;
  message: string;
};

type SupabaseUrlValidation =
  | { ok: true; url: string }
  | { ok: false; issue: SupabaseConfigIssue };

type SupabaseKeyValidation =
  | { ok: true; key: string }
  | { ok: false; issue: SupabaseConfigIssue };

type SupabaseBrowserConfigValidation =
  | { ok: true; config: { url: string; anonKey: string } }
  | { ok: false; issue: SupabaseConfigIssue };

type SupabaseAdminConfigValidation =
  | { ok: true; config: { url: string; serviceRoleKey: string } }
  | { ok: false; issue: SupabaseConfigIssue };

const PROJECT_URL_EXAMPLE = "https://your-project-ref.supabase.co";

function validateSupabaseUrl(rawUrl: string | undefined): SupabaseUrlValidation {
  const value = rawUrl?.trim();

  if (!value) {
    return {
      ok: false,
      issue: {
        code: "missing_supabase_url",
        message: `NEXT_PUBLIC_SUPABASE_URL is missing. Use the Supabase Project URL from Settings > API, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  if (!/^https?:\/\//i.test(value)) {
    return {
      ok: false,
      issue: {
        code: "missing_supabase_url_scheme",
        message: `NEXT_PUBLIC_SUPABASE_URL must include https://, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      issue: {
        code: "invalid_supabase_url",
        message: `NEXT_PUBLIC_SUPABASE_URL is not a valid URL. Use the project API URL, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  if (parsed.hostname === "supabase.com" || parsed.hostname === "www.supabase.com") {
    return {
      ok: false,
      issue: {
        code: "supabase_dashboard_url",
        message: `NEXT_PUBLIC_SUPABASE_URL points to the Supabase dashboard. Use the project API URL from Settings > API, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  const isLocalSupabase =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";
  const isHostedSupabase =
    parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".supabase.co") || parsed.hostname.endsWith(".supabase.in"));

  if (!isLocalSupabase && !isHostedSupabase) {
    return {
      ok: false,
      issue: {
        code: "unsupported_supabase_url_host",
        message: `NEXT_PUBLIC_SUPABASE_URL should be a Supabase project API URL like ${PROJECT_URL_EXAMPLE}. Do not use the dashboard URL.`
      }
    };
  }

  if (!isLocalSupabase && parsed.protocol !== "https:") {
    return {
      ok: false,
      issue: {
        code: "supabase_url_requires_https",
        message: `NEXT_PUBLIC_SUPABASE_URL must use https:// for hosted Supabase projects, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return {
      ok: false,
      issue: {
        code: "supabase_url_has_path",
        message: `NEXT_PUBLIC_SUPABASE_URL should not include a path, query, or dashboard route. Use only the project origin, for example ${PROJECT_URL_EXAMPLE}.`
      }
    };
  }

  return { ok: true, url: parsed.origin };
}

function validateBrowserKey(rawKey: string | undefined): SupabaseKeyValidation {
  const key = rawKey?.trim();

  if (!key) {
    return {
      ok: false,
      issue: {
        code: "missing_supabase_publishable_key",
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Use the Supabase anon public key or new publishable key from Settings > API."
      }
    };
  }

  if (key.startsWith("sb_secret_")) {
    return {
      ok: false,
      issue: {
        code: "secret_key_in_browser",
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY must not use a Supabase secret key. Use the anon public key or new publishable key."
      }
    };
  }

  return { ok: true, key };
}

function validateAdminKey(rawKey: string | undefined): SupabaseKeyValidation {
  const key = rawKey?.trim();

  if (!key) {
    return {
      ok: false,
      issue: {
        code: "missing_supabase_service_key",
        message: "SUPABASE_SERVICE_ROLE_KEY is missing. Use the Supabase service role key or new secret key for server-side storage."
      }
    };
  }

  if (key.startsWith("sb_publishable_")) {
    return {
      ok: false,
      issue: {
        code: "publishable_key_in_admin_client",
        message: "SUPABASE_SERVICE_ROLE_KEY must use a server-side service role or secret key, not a publishable browser key."
      }
    };
  }

  return { ok: true, key };
}

export function validateSupabaseBrowserConfig(): SupabaseBrowserConfigValidation {
  const url = validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url.ok) return url;

  const anonKey = validateBrowserKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!anonKey.ok) return anonKey;

  return { ok: true, config: { url: url.url, anonKey: anonKey.key } };
}

export function validateSupabaseAdminConfig(): SupabaseAdminConfigValidation {
  const url = validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url.ok) return url;

  const serviceRoleKey = validateAdminKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceRoleKey.ok) return serviceRoleKey;

  return { ok: true, config: { url: url.url, serviceRoleKey: serviceRoleKey.key } };
}

export function getSupabaseBrowserConfig() {
  const validation = validateSupabaseBrowserConfig();
  return validation.ok ? validation.config : null;
}

export function getSupabaseBrowserConfigIssue() {
  const validation = validateSupabaseBrowserConfig();
  return validation.ok ? null : validation.issue;
}

export function getSupabaseAdminConfig() {
  const validation = validateSupabaseAdminConfig();
  return validation.ok ? validation.config : null;
}

export function getSupabaseAdminConfigIssue() {
  const validation = validateSupabaseAdminConfig();
  return validation.ok ? null : validation.issue;
}
