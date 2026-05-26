"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { normalizeAppReturnPath } from "@/lib/canonicalUrl";

const SAVED_RESULTS_KEY = "ats-resume-app:last-results";
const CHECKOUT_SNAPSHOT_KEY = "ats-resume-app:checkout-snapshot";
const CHECKOUT_RETURN_KEY = "ats-resume-app:checkout-returned";
const CHECKOUT_RETURN_PATH_KEY = "career-ladder:checkout-return-path";

export default function CheckoutSuccessBridge() {
  const [hasSavedResults, setHasSavedResults] = useState(false);
  const [continueHref, setContinueHref] = useState("/?step=results&checkout=success&restore=failed");
  const [missingSession, setMissingSession] = useState(false);
  const [checkoutStatus, setCheckoutStatus] =
    useState<"verifying" | "verified" | "invalid">("verifying");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutSessionId = params.get("session_id");
    if (!checkoutSessionId) {
      setMissingSession(true);
      setContinueHref("/pricing");
      return;
    }
    const saved =
      window.sessionStorage.getItem(CHECKOUT_SNAPSHOT_KEY) ??
      window.sessionStorage.getItem(SAVED_RESULTS_KEY);
    if (saved) {
      window.sessionStorage.setItem(SAVED_RESULTS_KEY, saved);
    }
    const savedOutputId = readSavedOutputId(saved);
    const savedReturnPath = readCheckoutReturnPath();
    setHasSavedResults(Boolean(saved));
    window.sessionStorage.setItem(CHECKOUT_RETURN_KEY, "1");
    const target = saved
      ? `/?step=results&checkout=success&session_id=${encodeURIComponent(checkoutSessionId)}${savedOutputId ? `&outputId=${encodeURIComponent(savedOutputId)}` : ""}`
      : savedReturnPath ?? `/dashboard?checkout=success`;
    setContinueHref(target);
    const timer = window.setTimeout(() => {
      void verifyCheckoutSession(checkoutSessionId).then((verified) => {
        if (!verified) {
          setCheckoutStatus("invalid");
          setContinueHref("/pricing");
          return;
        }
        setCheckoutStatus("verified");
        window.sessionStorage.removeItem(CHECKOUT_RETURN_PATH_KEY);
        trackEvent("checkout_completed", { sessionId: checkoutSessionId });
        window.location.replace(target);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  const checkoutVerified = checkoutStatus === "verified";
  const checkoutInvalid = missingSession || checkoutStatus === "invalid";

  return (
    <section className="checkout-success-card space-y-5 text-center">
      <p className="app-kicker">{checkoutInvalid ? "Checkout" : checkoutVerified ? "Checkout complete" : "Verifying checkout"}</p>
      <h1 className="text-4xl app-heading">
        {checkoutInvalid
          ? "Choose a credit pack to continue."
          : checkoutVerified
            ? "Payment successful"
            : "Confirming your Stripe payment."}
      </h1>
      <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        {checkoutInvalid
          ? "We did not receive a verified Stripe checkout session for this visit, so no payment has been confirmed."
          : checkoutVerified
            ? hasSavedResults
              ? "Your credits are attached to your account. Returning you to the application materials you were working on."
              : "Your credits are attached to your account. Returning you to your career workspace."
            : "This only takes a moment. We are confirming the Stripe session, refreshing your credit balance, and sending you back to the right place."}
      </p>
      {!checkoutInvalid && (
        <div className="checkout-success-steps">
          <span className={checkoutStatus === "verifying" ? "is-active" : "is-done"}>Verify payment</span>
          <span className={checkoutVerified ? "is-done" : ""}>Refresh credits</span>
          <span className={checkoutVerified ? "is-done" : ""}>Return to materials</span>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={checkoutInvalid ? "/pricing" : hasSavedResults ? continueHref : continueHref}
          className="app-button-primary"
        >
          {checkoutInvalid ? "View pricing" : "Continue"}
        </Link>
      </div>
    </section>
  );
}

async function verifyCheckoutSession(sessionId: string | null) {
  if (!sessionId) return false;
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
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[CheckoutSuccessBridge] Checkout verification request failed", error);
    return false;
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

function readCheckoutReturnPath() {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_RETURN_PATH_KEY);
    if (!raw) return null;
    return normalizeAppReturnPath(raw, window.location.origin);
  } catch {
    return null;
  }
}
