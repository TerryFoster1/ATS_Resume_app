"use client";

import { useEffect, useState } from "react";

type CheckoutButtonProps = {
  pack: "5" | "10";
  autoStart?: boolean;
  children: React.ReactNode;
};

const PENDING_PACK_KEY = "ats-resume-app:pending-checkout-pack";

export default function CheckoutButton({ pack, autoStart = false, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureSignedInBeforeCheckout() {
    try {
      const response = await fetch("/api/account/status", { cache: "no-store" });
      const status = (await response.json()) as { signedIn?: boolean };
      if (response.ok && status.signedIn) return true;
    } catch {
      // Let the auth redirect handle unclear session state.
    }
    window.sessionStorage.setItem(PENDING_PACK_KEY, pack);
    window.location.href = `/auth?next=${encodeURIComponent(`/pricing?pack=${pack}&checkout=1`)}`;
    return false;
  }

  async function startCheckout() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const signedIn = await ensureSignedInBeforeCheckout();
      if (!signedIn) return;
      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack })
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (response.status === 401) {
        window.sessionStorage.setItem(PENDING_PACK_KEY, pack);
        window.location.href = `/auth?next=${encodeURIComponent(`/pricing?pack=${pack}&checkout=1`)}`;
        return;
      }
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoStart || typeof window === "undefined") return;
    const pendingPack = window.sessionStorage.getItem(PENDING_PACK_KEY);
    if (pendingPack && pendingPack !== pack) return;
    window.sessionStorage.removeItem(PENDING_PACK_KEY);
    window.setTimeout(() => void startCheckout(), 250);
    // Auto-start is only used immediately after an auth redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, pack]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="app-button-primary w-full"
      >
        {loading ? "Opening checkout..." : children}
      </button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
