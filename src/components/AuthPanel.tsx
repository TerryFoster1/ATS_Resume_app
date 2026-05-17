"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseBrowserConfigIssue } from "@/lib/supabase/config";

function getFriendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("invalid path specified in request url") ||
    lowerMessage.includes("failed to construct 'url'") ||
    lowerMessage.includes("invalid url")
  ) {
    return "Supabase auth is misconfigured. Check NEXT_PUBLIC_SUPABASE_URL and use the project API URL from Settings > API, not the dashboard URL.";
  }

  return error instanceof Error ? error.message : "Authentication failed.";
}

function getFriendlyGoogleAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("provider") ||
    lowerMessage.includes("oauth") ||
    lowerMessage.includes("google") ||
    lowerMessage.includes("unsupported") ||
    lowerMessage.includes("not enabled") ||
    lowerMessage.includes("not configured")
  ) {
    return "Google sign-in is not configured yet. You can use email and password for now.";
  }

  return getFriendlyAuthError(error);
}

function getAuthRedirectUrl(next: string) {
  const currentOrigin = getCurrentCanonicalOrigin();
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  const origin = currentOrigin || configuredOrigin;
  const safeNext = normalizeNextPath(next, origin);
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

function getCurrentCanonicalOrigin() {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const host = window.location.host.toLowerCase();
  if (host.endsWith(".vercel.app") && host !== "ats-resume-app-sage.vercel.app") {
    return "https://ats-resume-app-sage.vercel.app";
  }
  return origin;
}

function normalizeNextPath(next: string, currentOrigin: string) {
  if (!next) return "/dashboard";
  try {
    const parsed = new URL(next, currentOrigin || "https://ats-resume-app-sage.vercel.app");
    const currentHost = currentOrigin ? new URL(currentOrigin).host : parsed.host;
    const isSameHost = parsed.host === currentHost;
    const isVercelDeployment = parsed.hostname.endsWith(".vercel.app");
    if (!isSameHost && !isVercelDeployment) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
  } catch {
    return next.startsWith("/") ? next : "/dashboard";
  }
}

export default function AuthPanel({
  next = "/dashboard",
  initialMode = "sign-in"
}: {
  next?: string;
  initialMode?: "sign-in" | "sign-up";
}) {
  const configIssue = getSupabaseBrowserConfigIssue();
  const supabase = createBrowserSupabaseClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) {
      setMessage(configIssue?.message || "Supabase auth is not configured yet.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: getAuthRedirectUrl(next)
          }
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = normalizeNextPath(next, window.location.origin);
      }
    } catch (err) {
      console.error("Supabase auth error", err);
      setMessage(getFriendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (!supabase) {
      setMessage(configIssue?.message || "Supabase auth is not configured yet.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(next)
      }
    });
    if (error) {
      console.error("Supabase OAuth error", error);
      setMessage(getFriendlyGoogleAuthError(error));
    }
  }

  return (
    <div className="app-screen-card mx-auto max-w-xl space-y-5">
      <div>
        <p className="app-kicker">Account</p>
        <h1 className="mt-2 text-3xl app-heading">
          {mode === "sign-in" ? "Sign in to your career workspace." : "Create your account."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Save generated resumes, cover letters, unlocks, and future interview prep in one place.
        </p>
      </div>

      <button type="button" onClick={continueWithGoogle} className="app-button-secondary w-full">
        Continue with Google
      </button>

      {configIssue && (
        <p className="rounded-[18px] bg-white px-4 py-3 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
          {configIssue.message}
        </p>
      )}

      <div className="space-y-3">
        {mode === "sign-up" && (
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="app-input"
            placeholder="Name"
          />
        )}
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="app-input"
          type="email"
          placeholder="Email"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="app-input"
          type="password"
          placeholder="Password"
        />
      </div>

      {message && (
        <p className="rounded-[18px] bg-white px-4 py-3 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
          {message}
        </p>
      )}

      <button type="button" onClick={submit} disabled={busy} className="app-button-primary w-full">
        {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="text-sm font-semibold text-[var(--color-accent-purple)]"
      >
        {mode === "sign-in" ? "Need an account? Create one." : "Already have an account? Sign in."}
      </button>
    </div>
  );
}
