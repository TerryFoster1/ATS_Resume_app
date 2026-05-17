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
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eef6ff] text-[11px] font-black text-[#2464a7]"
        >
          {status.email?.[0]?.toUpperCase() ?? "A"}
        </span>
        <span>{status.credits} credits</span>
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
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-3 py-2 font-bold text-[var(--color-text-primary)] hover:bg-[#f4f8fb]"
              >
                Dashboard
              </Link>
              <Link
                href="/pricing?pack=5&checkout=1"
                className="block rounded-[14px] px-3 py-2 font-bold text-[var(--color-text-primary)] hover:bg-[#f4f8fb]"
              >
                Buy credits
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="block w-full rounded-[14px] px-3 py-2 text-left font-bold text-[var(--color-text-muted)] hover:bg-[#f4f8fb]"
                >
                  Sign out
                </button>
              </form>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
