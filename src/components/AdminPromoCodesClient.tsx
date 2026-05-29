"use client";

import { useEffect, useState } from "react";
import type { PromoCodeRecord, PromoCodeRedemptionRecord } from "@/lib/promoCodes";

type PromoPayload = {
  codes?: PromoCodeRecord[];
  redemptions?: PromoCodeRedemptionRecord[];
  error?: string;
};

export default function AdminPromoCodesClient() {
  const [codes, setCodes] = useState<PromoCodeRecord[]>([]);
  const [redemptions, setRedemptions] = useState<PromoCodeRedemptionRecord[]>([]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [creditAmount, setCreditAmount] = useState("5");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [freeBetaAccess, setFreeBetaAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo-codes", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as PromoPayload;
      if (!response.ok) throw new Error(data.error ?? "Could not load promo codes.");
      setCodes(data.codes ?? []);
      setRedemptions(data.redemptions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load promo codes.");
    } finally {
      setBusy(false);
    }
  }

  async function createCode() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          code,
          description,
          creditAmount: Number(creditAmount || 0),
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          expiresAt: expiresAt || undefined,
          freeBetaAccess
        })
      });
      const data = (await response.json().catch(() => ({}))) as PromoPayload;
      if (!response.ok) throw new Error(data.error ?? "Could not create promo code.");
      setCodes(data.codes ?? []);
      setRedemptions(data.redemptions ?? []);
      setCode("");
      setDescription("");
      setMessage("Promo code created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create promo code.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(id: string, active: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActive", id, active })
      });
      const data = (await response.json().catch(() => ({}))) as PromoPayload;
      if (!response.ok) throw new Error(data.error ?? "Could not update promo code.");
      setCodes(data.codes ?? []);
      setRedemptions(data.redemptions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update promo code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-screen-card">
        <p className="app-kicker">Admin beta access</p>
        <h1 className="mt-3 text-3xl app-heading sm:text-4xl">Promo code management</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
          Create beta codes, grant fixed credits, track redemptions, and deactivate codes without changing Stripe.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="app-mini-card">
          <p className="app-kicker">Create code</p>
          <div className="mt-4 space-y-3">
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="app-input" placeholder="CAREERBETA" />
            <input value={description} onChange={(event) => setDescription(event.target.value)} className="app-input" placeholder="Description optional" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className="app-input" placeholder="Credits" />
              <input value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} className="app-input" placeholder="Max redemptions optional" />
            </div>
            <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="app-input" placeholder="Expires at optional, e.g. 2026-07-01T00:00:00Z" />
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)]">
              <input type="checkbox" checked={freeBetaAccess} onChange={(event) => setFreeBetaAccess(event.target.checked)} />
              Mark as free beta access
            </label>
            <button type="button" onClick={() => void createCode()} disabled={busy} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60">
              Create promo code
            </button>
            {message && <p className="text-sm font-semibold text-[var(--color-text-muted)]">{message}</p>}
          </div>
        </article>

        <article className="app-mini-card">
          <p className="app-kicker">Active codes</p>
          <div className="mt-4 space-y-3">
            {codes.map((item) => (
              <div key={item.id} className="rounded-[18px] bg-white px-4 py-3 shadow-[var(--shadow-inset-soft)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <strong className="block text-base app-heading">{item.code}</strong>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {item.creditAmount} credits · {item.redemptionCount}{item.maxRedemptions ? `/${item.maxRedemptions}` : ""} redeemed · {item.active ? "active" : "inactive"}
                    </p>
                    {item.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.description}</p>}
                  </div>
                  <button type="button" onClick={() => void setActive(item.id, !item.active)} className="app-button-ghost">
                    {item.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
            {!codes.length && <p className="text-sm text-[var(--color-text-muted)]">No promo codes yet.</p>}
          </div>
        </article>
      </section>

      <section className="app-mini-card">
        <p className="app-kicker">Recent redemptions</p>
        <div className="mt-4 space-y-2">
          {redemptions.map((item) => (
            <p key={item.id} className="rounded-[16px] bg-white px-4 py-3 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
              <strong className="text-[var(--color-text-primary)]">{item.code}</strong> granted {item.creditsGranted} credits to {item.userId} on {new Date(item.redeemedAt).toLocaleString()}.
            </p>
          ))}
          {!redemptions.length && <p className="text-sm text-[var(--color-text-muted)]">No redemptions yet.</p>}
        </div>
      </section>
    </div>
  );
}
