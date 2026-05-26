"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  composeJobContextText,
  INTENT_JOB_CONTEXT_KEY,
  type JobContext,
  type JobIntent
} from "@/lib/intentWorkflow";

type Props = {
  initialContextText?: string;
  onResumeIntent: (contextText: string) => void;
};

const INTENTS: Array<{
  id: JobIntent;
  title: string;
  description: string;
  disabled?: boolean;
}> = [
  {
    id: "resume",
    title: "Tailor Resume",
    description: "Upload or use your resume to create a role-specific version."
  },
  {
    id: "resumeCoverLetter",
    title: "Resume + Cover Letter",
    description: "Generate both documents for this job."
  },
  {
    id: "interviewPrep",
    title: "Interview Prep",
    description: "Get recruiter-style questions and prep notes for this role."
  },
  {
    id: "mockInterview",
    title: "Mock Interview",
    description: "Practice one question at a time with AI feedback."
  },
  {
    id: "careerPathway",
    title: "Career Pathway",
    description: "Compare your current background against a target role and unlock a practical growth plan."
  }
];

export default function JobIntentFlow({
  initialContextText = "",
  onResumeIntent
}: Props) {
  const initial = useMemo(() => readInitialContext(initialContextText), [initialContextText]);
  const [targetRole, setTargetRole] = useState(initial.targetRole);
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [jobPosting, setJobPosting] = useState(initial.jobPosting ?? "");
  const [currentBackground, setCurrentBackground] = useState(initial.currentBackground ?? "");
  const [stage, setStage] = useState<"intake" | "intent">(
    initial.targetRole ? "intent" : "intake"
  );
  const [busyIntent, setBusyIntent] = useState<JobIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const context: JobContext = useMemo(
    () => ({
      targetRole,
      companyName,
      jobPosting,
      currentBackground
    }),
    [companyName, currentBackground, jobPosting, targetRole]
  );
  const contextText = composeJobContextText(context);
  const canContinue = targetRole.trim().length >= 2 || jobPosting.trim().length >= 20;

  const handleIntent = useCallback(
    async (intent: JobIntent) => {
      setError(null);
      if (!canContinue) {
        setStage("intake");
        setError("Add a target role or paste enough of the job posting first.");
        return;
      }

      if (intent === "resume" || intent === "resumeCoverLetter") {
        persistContext(context);
        onResumeIntent(contextText);
        return;
      }

      setBusyIntent(intent);
      persistContext(context);
      try {
        const response = await fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole: targetRole.trim() || undefined,
            companyName: companyName.trim() || undefined,
            jobPosting: jobPosting.trim() || undefined,
            currentBackground: currentBackground.trim() || undefined,
            intent
          })
        });

        if (response.status === 401) {
          const next = `/?step=intent&intent=${encodeURIComponent(intent)}`;
          window.location.href = `/auth?next=${encodeURIComponent(next)}`;
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
          id?: string;
          error?: string;
        };
        if (!response.ok || !data.id) {
          throw new Error(data.error ?? "Could not create this opportunity.");
        }

        if (intent === "mockInterview") {
          window.location.href = `/outputs/${data.id}/interview?start=1`;
          return;
        }
        if (intent === "careerPathway") {
          window.location.href = `/outputs/${data.id}?intent=pathway`;
          return;
        }
        window.location.href = `/outputs/${data.id}?intent=interview-prep`;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start this workflow.");
      } finally {
        setBusyIntent(null);
      }
    },
    [canContinue, companyName, context, contextText, currentBackground, jobPosting, onResumeIntent, targetRole]
  );

  useEffect(() => {
    if (stage !== "intent") return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent") as JobIntent | null;
    if (!intent || !INTENTS.some((item) => item.id === intent && !item.disabled)) return;
    params.delete("intent");
    const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
    window.history.replaceState(null, "", next);
    const timer = window.setTimeout(() => void handleIntent(intent), 300);
    return () => window.clearTimeout(timer);
  }, [handleIntent, stage]);

  if (stage === "intake") {
    return (
      <section className="app-screen-card space-y-7">
        <div className="max-w-3xl">
          <p className="app-kicker">Start with the role</p>
          <h2 className="mt-3 text-4xl app-heading">
            Prepare for the jobs you actually want.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
            Paste a job posting, enter a target role, or add both. Career Ladder
            uses this as the shared context for resume tailoring, cover letters,
            interview prep, and mock interview practice.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Target role
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="app-input mt-3"
              placeholder="Customer Success Manager"
            />
          </label>
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Company optional
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="app-input mt-3"
              placeholder="RECODemand"
            />
          </label>
          <label className="block text-sm font-black text-[var(--color-text-primary)]">
            Full job posting optional, strongly encouraged
            <textarea
              value={jobPosting}
              onChange={(event) => setJobPosting(event.target.value)}
              className="app-input mt-3 min-h-[12rem] resize-y"
              placeholder="Paste the posting for stronger tailoring and more realistic interview prep."
            />
          </label>
        </div>
        <label className="block text-sm font-black text-[var(--color-text-primary)]">
          Current background optional
          <textarea
            value={currentBackground}
            onChange={(event) => setCurrentBackground(event.target.value)}
            className="app-input mt-3 min-h-[8rem] resize-y"
            placeholder="Example: I currently work in retail, manage customer issues, train new hires, and want to move into customer success."
          />
        </label>

        {error && <p className="text-sm font-semibold text-rose-800">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">
            Job-title-only mode works for interview prep. Resume tailoring is
            stronger with the full posting.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!canContinue) {
                setError("Add a target role or paste enough of the job posting first.");
                return;
              }
              persistContext(context);
              setStage("intent");
              window.history.replaceState(null, "", "/?step=intent");
            }}
            className="app-button-primary"
          >
            Choose what to work on
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="app-screen-card space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="app-kicker">Choose your goal</p>
          <h2 className="mt-3 text-4xl app-heading">What do you want help with?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            We will use {targetRole.trim() || "this role"}{companyName.trim() ? ` at ${companyName.trim()}` : ""} as
            the shared context.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStage("intake");
            window.history.replaceState(null, "", "/?step=intake");
          }}
          className="app-button-ghost"
        >
          Edit role context
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTENTS.map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => void handleIntent(intent.id)}
            disabled={Boolean(intent.disabled || busyIntent)}
            className="app-mini-card text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(17,35,63,0.1)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="app-kicker">
              {intent.disabled ? "Coming soon" : busyIntent === intent.id ? "Starting" : "Workflow"}
            </span>
            <strong className="mt-3 block text-xl app-heading">{intent.title}</strong>
            <span className="mt-3 block text-sm leading-6 text-[var(--color-text-muted)]">
              {intent.description}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {error}
        </p>
      )}
    </section>
  );
}

function readInitialContext(initialContextText: string): JobContext {
  if (typeof window !== "undefined") {
    try {
      const saved = window.sessionStorage.getItem(INTENT_JOB_CONTEXT_KEY);
      if (saved) return JSON.parse(saved) as JobContext;
    } catch {
      // Ignore malformed session data.
    }
  }

  const role = initialContextText.match(/^job\s*title\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const company = initialContextText.match(/^company\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const postingMatch = initialContextText.match(/(?:^|\n)job posting:\s*\n([\s\S]*)$/i);
  const backgroundMatch = initialContextText.match(/(?:^|\n)current background:\s*\n([\s\S]*?)(?:\n\s*job posting:|$)/i);
  return {
    targetRole: role,
    companyName: company,
    currentBackground: backgroundMatch?.[1]?.trim() || undefined,
    jobPosting: postingMatch?.[1]?.trim() || undefined
  };
}

function persistContext(context: JobContext) {
  try {
    window.sessionStorage.setItem(INTENT_JOB_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Session storage is a convenience only.
  }
}
