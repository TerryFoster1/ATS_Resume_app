"use client";

import { useState } from "react";

type RedeemResponse = {
  status?: string;
  creditsGranted?: number;
  credits?: number;
  error?: string;
};

export default function PromoCodeRedeemer() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function redeem() {
    if (!code.trim()) {
      setMessage("Enter a beta or promo code first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/promo-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = (await response.json().catch(() => ({}))) as RedeemResponse;
      if (!response.ok) throw new Error(data.error ?? "Could not redeem that code.");
      setMessage(messageForStatus(data));
      if (data.status === "redeemed") setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not redeem that code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-mini-card">
      <p className="app-kicker">Beta access</p>
      <h2 className="mt-2 text-2xl app-heading">Redeem a promo code.</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
        Promo credits behave like purchased credits and can be used for unlocks, interview prep, pathways, and beta testing flows.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="app-input"
          placeholder="CAREERBETA"
        />
        <button
          type="button"
          onClick={() => void redeem()}
          disabled={busy}
          className="app-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Redeeming..." : "Redeem"}
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded-[16px] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
          {message}
        </p>
      )}
    </section>
  );
}

function messageForStatus(data: RedeemResponse) {
  if (data.status === "redeemed") {
    return `${data.creditsGranted ?? 0} credit${data.creditsGranted === 1 ? "" : "s"} added. Current balance: ${data.credits ?? "updated"}.`;
  }
  if (data.status === "already_redeemed") return "You have already redeemed this code.";
  if (data.status === "expired") return "That promo code has expired.";
  if (data.status === "inactive") return "That promo code is no longer active.";
  if (data.status === "limit_reached") return "That promo code has reached its redemption limit.";
  if (data.status === "not_found") return "We could not find that promo code.";
  return "That promo code could not be redeemed.";
}
