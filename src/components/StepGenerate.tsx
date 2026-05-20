"use client";

import { useEffect, useRef, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import StepIndicator from "@/components/StepIndicator";
import { DocumentStackGraphic } from "@/components/VisualDecor";
import { enforceAnsweredEvidenceInResume } from "@/lib/analysis/answerTransform";
import { trackEvent } from "@/lib/analytics";
import { sanitizeGeneratedText } from "@/lib/sanitizeGeneratedText";
import { limitSkillsSection } from "@/lib/skillsSection";
import type {
  AnalysisResult,
  AtsRuleResult,
  CheckResponse,
  GenerateResponse,
  RescoreResponse,
  SessionState
} from "@/lib/types";

interface Props {
  state: SessionState;
  onBack: () => void;
  onDone: (
    partial: Pick<
      SessionState,
      | "tailoredResume"
      | "tailoredCoverLetter"
      | "atsReport"
      | "revisionPass"
      | "finalAnalysis"
    >
  ) => void;
}

const GENERATE_TIMEOUT_MS = 110_000;
const CHECK_TIMEOUT_MS = 110_000;
const RESCORE_TIMEOUT_MS = 110_000;

const PHASES = [
  "Reading the analysis and confirmed details",
  "Drafting a tailored resume in your voice",
  "Writing a cover letter grounded in your real experience",
  "Running ATS-style formatting checks",
  "Checking the tailored resume against the posting"
];

export default function StepGenerate({ state, onBack, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const ranRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((n) => (n + 1) % PHASES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (!state.analysis) {
      setError("Analysis is missing. Please go back and re-run analyze.");
      return;
    }
    void startGeneration();
  }, [state, onDone]);

  function startGeneration() {
    setError(null);
    setRetryMessage(null);
    setRunning(true);
    void runPipeline(state, onDone, setError, setRetryMessage).finally(() =>
      setRunning(false)
    );
  }

  return (
    <section className="space-y-5">
      <StepIndicator current={4} total={4} label="Generation" />

      <div className="app-screen-card">
        <div className="app-feature-panel-purple grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/70">
              Building your materials
            </p>
            <h2 className="text-3xl font-black leading-tight text-white">
              Tailoring your resume and cover letter
            </h2>
            <p className="max-w-xl text-sm leading-6 text-white/72">
              We are rewriting the materials around your real experience, then
              checking the result before showing the final documents.
            </p>
            {!error && (
              <LoadingIndicator
                message={retryMessage ?? "Working\u2026"}
                messages={PHASES}
                cycleMs={3500}
                className="bg-white/12 text-white"
              />
            )}
            {error && (
              <div className="space-y-3 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-[var(--shadow-card)]">
                <p className="font-medium">Generation failed.</p>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={startGeneration}
                  disabled={running}
                  className="rounded-full bg-white px-4 py-2 text-xs font-bold text-rose-800 shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? "Trying again..." : "Try again"}
                </button>
              </div>
            )}
            <p className="text-[11px] uppercase tracking-wider text-white/55">
              {PHASES[phaseIdx]}
            </p>
          </div>
          <DocumentStackGraphic className="mx-auto hidden md:block" />
        </div>
      </div>

      {error && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="app-button-secondary"
          >
            Back
          </button>
        </div>
      )}
    </section>
  );
}

async function runPipeline(
  state: SessionState,
  onDone: Props["onDone"],
  setError: (msg: string) => void,
  setRetryMessage: (msg: string | null) => void
) {
  if (!state.analysis) {
    setError("Analysis is missing.");
    return;
  }
  try {
    trackEvent("generation_started");
    let tailoredResume = "";
    let tailoredCoverLetter = "";
    let atsReport: AtsRuleResult[] = [];
    let feedback = "";
    let revisionPass = 0;

    for (let attempt = 1; attempt <= 2; attempt++) {
      revisionPass = attempt;
      const resumeText = feedback
        ? `${state.resumeText.trim()}

ATS REVIEW FEEDBACK TO FIX AUTOMATICALLY
${feedback}`
        : state.resumeText;

      const gen = await postGenerateWithRetry<GenerateResponse>(
        "/api/generate",
        {
          resumeText,
          jobPostText: state.jobPostText,
          analysis: state.analysis,
          followUps: state.followUps
        },
        GENERATE_TIMEOUT_MS,
        setRetryMessage
      );
      setRetryMessage(null);

      tailoredResume = sanitizeGeneratedText(limitSkillsSection(gen.resume));
      tailoredResume = sanitizeGeneratedText(
        enforceAnsweredEvidenceInResume({
          resumeText: tailoredResume,
          analysis: state.analysis,
          followUps: state.followUps
        }).resumeText
      );
      tailoredCoverLetter = sanitizeGeneratedText(gen.coverLetter);

      try {
        const firstCheck = await runCheck({
          resume: tailoredResume,
          coverLetter: tailoredCoverLetter,
          state
        });
        atsReport = firstCheck.report;

        if (reportPassed(atsReport)) {
          const secondCheck = await runCheck({
            resume: tailoredResume,
            coverLetter: tailoredCoverLetter,
            state
          });
          atsReport = secondCheck.report;
          if (reportPassed(atsReport)) break;
        }

        feedback = atsReport
          .filter((rule) => !rule.passed)
          .map((rule) => `- ${rule.rule}: ${rule.detail ?? "Needs revision."}`)
          .join("\n");
      } catch (err) {
        console.warn("[StepGenerate] /api/check failed", err);
        break;
      }
    }

    let finalAnalysis: AnalysisResult | undefined = undefined;
    try {
      const rescore = await postJson<RescoreResponse>(
        "/api/rescore",
        {
          resumeText: tailoredResume,
          jobPostText: state.jobPostText,
          baseline: state.analysis,
          followUps: state.followUps
        },
        RESCORE_TIMEOUT_MS
      );
      finalAnalysis = rescore.analysis;
    } catch (err) {
      console.warn("[StepGenerate] /api/rescore failed", err);
    }

    onDone({
      tailoredResume,
      tailoredCoverLetter,
      atsReport,
      revisionPass,
      finalAnalysis
    });
    trackEvent("generation_completed", { revisionPass });
  } catch (err) {
    setRetryMessage(null);
    setError(friendlyGenerationError(err));
  }
}

async function postGenerateWithRetry<T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  setRetryMessage: (msg: string | null) => void
): Promise<T> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await postJson<T>(url, body, timeoutMs);
    } catch (err) {
      if (!isProviderOverload(err) || attempt >= maxRetries) {
        throw err;
      }
      setRetryMessage("Provider is busy, retrying...");
      await delay(900 * (attempt + 1));
    }
  }
  throw new Error("Generation failed.");
}

async function runCheck(args: {
  resume: string;
  coverLetter: string;
  state: SessionState;
}): Promise<CheckResponse> {
  return postJson<CheckResponse>(
    "/api/check",
    {
      resume: args.resume,
      coverLetter: args.coverLetter,
      jobPostText: args.state.jobPostText,
      analysis: args.state.analysis
    },
    CHECK_TIMEOUT_MS
  );
}

function reportPassed(report: AtsRuleResult[]): boolean {
  return report.length > 0 && report.every((rule) => rule.passed);
}

async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text();
      throw new RequestError(res.status, text);
    }
    return (await res.json()) as T;
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new RequestError(408, "Request timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`${status} ${body}`);
    this.name = "RequestError";
  }
}

function isProviderOverload(err: unknown): boolean {
  const text = errorText(err);
  return /\b529\b|overloaded_error|overload|provider is busy/i.test(text);
}

function isTemporaryProviderIssue(err: unknown): boolean {
  const text = errorText(err);
  return /\b408\b|\b429\b|\b503\b|\b529\b|overloaded_error|overload|rate.?limit|timeout|temporar(?:y|ily)|unavailable|aborterror/i.test(
    text
  );
}

function friendlyGenerationError(err: unknown): string {
  if (isTemporaryProviderIssue(err)) {
    return "The AI service is temporarily busy. Please try again in a moment.";
  }
  return "We couldn't finish generating your materials. Please try again.";
}

function errorText(err: unknown): string {
  if (err instanceof RequestError) return `${err.status} ${err.body}`;
  if (err instanceof Error) return `${err.name} ${err.message}`;
  return String(err);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}





