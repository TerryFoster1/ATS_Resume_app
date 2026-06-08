"use client";

import { useEffect, useState } from "react";

// Reusable loading indicator. Used wherever the user is waiting on the
// network (analyze, parse-resume, generate, rescore). The "block" variant
// is a panel-sized indicator; the "inline" variant is a tiny pulsing-dots
// cluster that sits next to a heading or label.
//
// Tailwind-only â€” no spinner library, no new deps. The three dots use
// staggered animation-delay values via inline style so they ripple instead
// of pulsing in unison.
//
// Cycling subtext: pass `messages` (string[]) and the indicator will rotate
// through them every `cycleMs` (default 2500ms). The cycle pauses on a
// single-message array. This is what gives the user the impression of
// progress when the LLM is mid-call and there's no real phase data to show.

interface Props {
  /** Primary message line. */
  message?: string;
  /**
   * Subtext that cycles through the array on a timer. Pass [] or omit to
   * skip the subtext line entirely.
   */
  messages?: string[];
  /** ms between subtext rotations. */
  cycleMs?: number;
  /**
   * "block" â€” centered panel, used inside a card or as a section
   * placeholder.
   * "inline" â€” small dots cluster, used next to a heading or button label.
   */
  variant?: "block" | "inline";
  /** Optional className to merge into the wrapper. */
  className?: string;
}

const DOT_BASE =
  "inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f80ed]";
// Tailwind's animate-pulse uses a ~2s cycle. We keep that and stagger the
// start time for each dot via inline style so the three dots ripple.
const DOT_DELAYS = ["0ms", "200ms", "400ms"];

function PulsingDots({ ariaLabel }: { ariaLabel?: string }) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? "Loading"}
      className="inline-flex items-center gap-1"
    >
      {DOT_DELAYS.map((d, i) => (
        <span
          key={i}
          aria-hidden
          className={`${DOT_BASE} animate-pulse`}
          style={{ animationDelay: d }}
        />
      ))}
    </span>
  );
}

export default function LoadingIndicator({
  message,
  messages,
  cycleMs = 2500,
  variant = "block",
  className = ""
}: Props) {
  const cycleable = messages && messages.length > 1;
  const [idx, setIdx] = useState(0);

  // Cycle subtext on a timer. Pause for a single-message array â€” there's
  // nothing to rotate to. We deliberately depend only on length so a parent
  // re-render with a new-but-equivalent array doesn't reset the cycle.
  useEffect(() => {
    if (!cycleable) return;
    const id = setInterval(() => {
      setIdx((n) => (n + 1) % messages.length);
    }, cycleMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length, cycleMs, cycleable]);

  const subtext =
    messages && messages.length > 0
      ? messages[idx % messages.length]
      : undefined;

  if (variant === "inline") {
    // Inline form: just dots + message on one line. Used next to a heading
    // ("Tailoring your materials" + dots) or to replace small "Extractingâ€¦"
    // strings under file inputs.
    return (
      <span
        className={`inline-flex items-center gap-2 text-xs text-[var(--color-text-primary)]/75 ${className}`}
      >
        <PulsingDots ariaLabel={message} />
        {message && <span className="text-[var(--color-text-primary)]/75">{message}</span>}
        {subtext && (
          <span className="text-[var(--color-text-primary)]/55" aria-live="polite">
            <span aria-hidden="true">·</span> {subtext}
          </span>
        )}
      </span>
    );
  }

  // Block form: a small panel centered, used inside a card while a long
  // request is in flight (analyze, generate). The cycling subtext gets a
  // little vertical room and an aria-live region so screen readers
  // announce the rotating text without re-reading the whole panel.
  return (
    <div
      role="status"
      aria-live="polite"
      className={`app-card-inset flex flex-col items-center justify-center gap-2 px-4 py-5 ${className}`}
    >
      <PulsingDots ariaLabel={message} />
      {message && (
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{message}</p>
      )}
      {subtext && (
        <p
          key={idx}
          className="text-xs text-[var(--color-text-primary)]/60 transition-opacity duration-300"
        >
          {subtext}
        </p>
      )}
    </div>
  );
}




