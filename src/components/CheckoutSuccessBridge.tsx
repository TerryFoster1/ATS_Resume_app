"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SAVED_RESULTS_KEY = "ats-resume-app:last-results";
const CHECKOUT_SNAPSHOT_KEY = "ats-resume-app:checkout-snapshot";
const CHECKOUT_RETURN_KEY = "ats-resume-app:checkout-returned";

export default function CheckoutSuccessBridge() {
  const [hasSavedResults, setHasSavedResults] = useState(false);
  const [continueHref, setContinueHref] = useState("/?step=results&checkout=success&restore=failed");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutSessionId = params.get("session_id");
    const saved =
      window.sessionStorage.getItem(CHECKOUT_SNAPSHOT_KEY) ??
      window.sessionStorage.getItem(SAVED_RESULTS_KEY);
    if (saved) {
      window.sessionStorage.setItem(SAVED_RESULTS_KEY, saved);
    }
    const savedOutputId = readSavedOutputId(saved);
    setHasSavedResults(Boolean(saved));
    window.sessionStorage.setItem(CHECKOUT_RETURN_KEY, "1");
    const target = saved
      ? `/?step=results&checkout=success${savedOutputId ? `&outputId=${encodeURIComponent(savedOutputId)}` : ""}`
      : "/?step=results&checkout=success&restore=failed";
    setContinueHref(target);
    const timer = window.setTimeout(() => {
      void verifyCheckoutSession(checkoutSessionId).finally(() => {
        window.location.replace(target);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="app-screen-card space-y-5 text-center">
      <p className="app-kicker">Checkout complete</p>
      <h1 className="text-4xl app-heading">Payment successful</h1>
      <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        Your credits are being added to your account. Sending you back to the
        generated output flow.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={hasSavedResults ? continueHref : "/?step=results&checkout=success&restore=failed"}
          className="app-button-primary"
        >
          Continue
        </Link>
      </div>
    </section>
  );
}

async function verifyCheckoutSession(sessionId: string | null) {
  if (!sessionId) return;
  try {
    const response = await fetch("/api/checkout/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    if (!response.ok) {
      console.warn("[CheckoutSuccessBridge] Checkout verification failed", {
        status: response.status,
        body: await response.text()
      });
    }
  } catch (error) {
    console.warn("[CheckoutSuccessBridge] Checkout verification request failed", error);
  }
}

function readSavedOutputId(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedOutputId?: unknown };
    return typeof parsed.savedOutputId === "string" ? parsed.savedOutputId : null;
  } catch {
    return null;
  }
}
