"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AccountStatus = {
  signedIn: boolean;
  credits: number;
  email?: string | null;
};

const DEFAULT_STATUS: AccountStatus = {
  signedIn: false,
  credits: 0
};

export const ACCOUNT_CREDITS_REFRESH_EVENT = "ats-account-credits-refresh";

export default function AccountCreditIndicator() {
  const [status, setStatus] = useState<AccountStatus>(DEFAULT_STATUS);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  async function refresh() {
    try {
      const response = await fetch("/api/account/status", {
        cache: "no-store"
      });
      if (!response.ok) return;
      setStatus((await response.json()) as AccountStatus);
    } catch {
      setStatus(DEFAULT_STATUS);
    }
  }

  useEffect(() => {
    setMounted(true);
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener(ACCOUNT_CREDITS_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);

    const params = new URLSearchParams(window.location.search);
    let timers: number[] = [];
    if (params.get("checkout") === "success") {
      timers = [1200, 3000, 6000].map((delay) =>
        window.setTimeout(onRefresh, delay)
      );
    }

    return () => {
      window.removeEventListener(ACCOUNT_CREDITS_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right)
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  if (!status.signedIn) {
    return (
      <Link href="/auth" className="app-header-pill">
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="app-header-pill"
        aria-expanded={open}
      >
        <span
          aria-hidden
          className="app-account-avatar"
        >
          {status.email?.[0]?.toUpperCase() ?? "A"}
        </span>
        <span className="app-account-credit-label">{status.credits} credits</span>
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="app-account-menu"
              style={{
                top: menuPosition.top,
                right: menuPosition.right
              }}
            >
              <div className="app-account-menu-header">
                <span className="app-account-avatar" aria-hidden>
                  {status.email?.[0]?.toUpperCase() ?? "A"}
                </span>
                <div className="min-w-0">
                  <p>{status.email ?? "Signed in"}</p>
                  <strong>{status.credits} credits available</strong>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="app-account-menu-item"
              >
                <span>Dashboard</span>
                <small>Open saved applications</small>
              </Link>
              <Link
                href="/pricing?pack=5&checkout=1"
                className="app-account-menu-item"
              >
                <span>Buy credits</span>
                <small>Add exports and prep unlocks</small>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="app-account-menu-item app-account-menu-button"
                >
                  <span>Sign out</span>
                  <small>Leave this workspace</small>
                </button>
              </form>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
