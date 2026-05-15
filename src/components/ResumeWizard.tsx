"use client";

import { useCallback, useEffect, useState } from "react";

import StepAnalysis from "@/components/StepAnalysis";
import StepGenerate from "@/components/StepGenerate";
import StepIntro from "@/components/StepIntro";
import StepJobPost from "@/components/StepJobPost";
import StepResults from "@/components/StepResults";
import StepResume from "@/components/StepResume";
import {
  coachingQuestionForMatch,
  roleContextForMatch
} from "@/lib/analysis/answerTransform";
import {
  blockerAnswerToFollowUp,
  getPreGenerationBlockers
} from "@/lib/preGenerationBlockers";
import type { AnalyzeResponse, SessionState } from "@/lib/types";

const INITIAL_STATE: SessionState = {
  resumeText: "",
  jobPostText: "",
  followUps: [],
  tailoredResume: "",
  tailoredCoverLetter: "",
  atsReport: [],
  revisionPass: 0
};

const SAVED_RESULTS_KEY = "ats-resume-app:last-results";

type Step = "intro" | "resume" | "job" | "analysis" | "generate" | "results";
type RestoreStatus = "idle" | "restoring" | "failed";
type RestoreFailureReason = "checkout" | "generic";
type StoredResults = SessionState & {
  applicationTitle?: string;
  savedOutputId?: string | null;
  unlockedResume?: boolean;
  unlockedCoverLetter?: boolean;
};

export default function ResumeWizard({ initialStep }: { initialStep: Step }) {
  const initialSavedResults =
    initialStep === "results" && typeof window !== "undefined"
      ? readSavedResults()
      : null;
  const initialSavedOutputId =
    initialStep === "results" && typeof window !== "undefined"
      ? readSavedOutputId()
      : null;
  const [step, setStep] = useState<Step>(initialStep);
  const [state, setState] = useState<SessionState>(initialSavedResults ?? INITIAL_STATE);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>(
    initialStep === "results" && (initialSavedOutputId || !initialSavedResults)
      ? "restoring"
      : "idle"
  );
  const [restoreFailureReason, setRestoreFailureReason] =
    useState<RestoreFailureReason>("generic");
  const [contextAnswers, setContextAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialStep !== "results") return;
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hasVerifiedCheckoutReturn =
      params.get("checkout") === "success" && Boolean(params.get("session_id"));
    if (params.get("restore") === "failed") {
      setRestoreFailureReason(hasVerifiedCheckoutReturn ? "checkout" : "generic");
      setRestoreStatus("failed");
      return;
    }
    const saved = readSavedResults();
    const savedOutputId = readSavedOutputId();
    if (!saved && !savedOutputId) {
      setRestoreFailureReason(hasVerifiedCheckoutReturn ? "checkout" : "generic");
      setRestoreStatus("failed");
      return;
    }
    if (savedOutputId) {
      setRestoreStatus("restoring");
      void fetchSavedOutput(savedOutputId).then((restored) => {
        if (!active) return;
        if (restored) {
          writeSavedResults(restored);
          setState(restored);
          setRestoreStatus("idle");
          return;
        }
        if (saved) {
          setState(saved);
          setRestoreStatus("idle");
          return;
        }
        setRestoreFailureReason(hasVerifiedCheckoutReturn ? "checkout" : "generic");
        setRestoreStatus("failed");
      });
      return () => {
        active = false;
      };
    }
    if (saved) {
      setState(saved);
      setRestoreStatus("idle");
    }
  }, [initialStep]);

  const updateState = useCallback((partial: Partial<SessionState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const handleAnalyzed = useCallback((data: Partial<AnalyzeResponse>) => {
    if (!data.analysis) return;
    const analysis = data.analysis;
    setState((current) => ({
      ...current,
      analysis,
      followUps: analysis.followUps,
      finalAnalysis: undefined,
      tailoredResume: "",
      tailoredCoverLetter: "",
      atsReport: [],
      revisionPass: 0
    }));
    setContextAnswers({});
  }, []);

  const handleRestart = useCallback(() => {
    setState(INITIAL_STATE);
    setContextAnswers({});
    window.sessionStorage.removeItem(SAVED_RESULTS_KEY);
    setStep("intro");
    window.history.replaceState(null, "", "/");
  }, []);

  const handleAnswerChange = useCallback(
    (requirementId: string, answer: string) => {
      setContextAnswers((current) => ({
        ...current,
        [requirementId]: answer
      }));
    },
    []
  );

  const handleGenerateFromAnalysis = useCallback(() => {
    if (!state.analysis) return;
    const followUps = buildAnsweredFollowUps({
      analysis: state.analysis,
      answers: contextAnswers,
      resumeText: state.resumeText
    });
    setState((current) => ({
      ...current,
      followUps,
      finalAnalysis: undefined,
      tailoredResume: "",
      tailoredCoverLetter: "",
      atsReport: [],
      revisionPass: 0
    }));
    setStep("generate");
  }, [contextAnswers, state.analysis]);

  return (
    <>
      {step === "intro" && <StepIntro onNext={() => setStep("resume")} />}

      {step === "resume" && (
        <StepResume
          value={state.resumeText}
          onChange={(resumeText) => updateState({ resumeText })}
          onNext={(resumeText) => {
            updateState({ resumeText });
            setStep("job");
          }}
        />
      )}

      {step === "job" && (
        <StepJobPost
          value={state.jobPostText}
          onChange={(jobPostText) => updateState({ jobPostText })}
          resumeText={state.resumeText}
          onAnalyzed={handleAnalyzed}
          onBack={() => setStep("resume")}
          onNext={() => setStep("analysis")}
        />
      )}

      {step === "analysis" && state.analysis && (
        <StepAnalysis
          analysis={state.analysis}
          resumeText={state.resumeText}
          answers={contextAnswers}
          onAnswerChange={handleAnswerChange}
          onBack={() => setStep("job")}
          onGenerate={handleGenerateFromAnalysis}
        />
      )}

      {step === "generate" && (
        <StepGenerate
          state={state}
          onBack={() => setStep("analysis")}
          onDone={(partial) => {
            updateState(partial);
            setStep("results");
          }}
        />
      )}

      {step === "results" && restoreStatus === "restoring" && (
        <ResultsRestoreLoading />
      )}

      {step === "results" && restoreStatus === "failed" && (
        <ResultsRestoreFailed
          reason={restoreFailureReason}
          onRestart={() => {
            setState(INITIAL_STATE);
            setContextAnswers({});
            setStep("intro");
            window.history.replaceState(null, "", "/");
          }}
        />
      )}

      {step === "results" && restoreStatus === "idle" && (
        <StepResults state={state} onRestart={handleRestart} />
      )}
    </>
  );
}

function buildAnsweredFollowUps(args: {
  analysis: NonNullable<SessionState["analysis"]>;
  answers: Record<string, string>;
  resumeText: string;
}) {
  const matchFollowUps = args.analysis.matches
    .filter((match) => args.answers[match.requirementId]?.trim())
    .map((match, index) => ({
      id: `inline-${index + 1}`,
      requirementId: match.requirementId,
      question: coachingQuestionForMatch(match, roleContextForMatch(args.analysis, match)),
      answer: args.answers[match.requirementId].trim()
    }));
  const blockerFollowUps = getPreGenerationBlockers(args.resumeText)
    .filter((blocker) => args.answers[blocker.id]?.trim())
    .map((blocker) => blockerAnswerToFollowUp(blocker, args.answers[blocker.id]));

  return [...matchFollowUps, ...blockerFollowUps];
}

function readSavedResults(): StoredResults | null {
  try {
    const raw = window.sessionStorage.getItem(SAVED_RESULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredResults;
    if (!parsed.tailoredResume || !parsed.tailoredCoverLetter) return null;
    parsed.followUps = parsed.followUps ?? [];
    parsed.atsReport = parsed.atsReport ?? [];
    parsed.revisionPass = parsed.revisionPass ?? 0;
    return parsed;
  } catch {
    return null;
  }
}

function readSavedOutputId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("outputId");
    if (fromUrl) return fromUrl;
    const saved = readSavedResults();
    return typeof saved?.savedOutputId === "string" ? saved.savedOutputId : null;
  } catch {
    return null;
  }
}

function writeSavedResults(results: StoredResults) {
  window.sessionStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(results));
}

async function fetchSavedOutput(id: string): Promise<StoredResults | null> {
  try {
    const response = await fetch(`/api/outputs/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      id: string;
      applicationTitle?: string;
      resumeText?: string;
      coverLetterText?: string;
      sourceJobDescription?: string;
      clarificationAnswers?: unknown;
      analysis?: SessionState["analysis"];
      resumeUnlocked?: boolean;
      coverLetterUnlocked?: boolean;
    };
    if (!data.resumeText || !data.coverLetterText) return null;
    return {
      resumeText: "",
      jobPostText: data.sourceJobDescription ?? "",
      analysis: data.analysis,
      followUps: Array.isArray(data.clarificationAnswers)
        ? data.clarificationAnswers as SessionState["followUps"]
        : [],
      tailoredResume: data.resumeText,
      tailoredCoverLetter: data.coverLetterText,
      atsReport: [],
      revisionPass: 0,
      applicationTitle: data.applicationTitle,
      savedOutputId: data.id,
      unlockedResume: Boolean(data.resumeUnlocked),
      unlockedCoverLetter: Boolean(data.coverLetterUnlocked)
    };
  } catch {
    return null;
  }
}

function ResultsRestoreLoading() {
  return (
    <section className="app-screen-card space-y-4 text-center">
      <p className="app-kicker">Restoring materials</p>
      <h1 className="text-3xl app-heading">Loading your generated resume.</h1>
      <p className="mx-auto max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
        We’re bringing your generated materials back after checkout.
      </p>
    </section>
  );
}

function ResultsRestoreFailed({
  reason,
  onRestart
}: {
  reason: RestoreFailureReason;
  onRestart: () => void;
}) {
  const checkoutFailed = reason === "checkout";
  return (
    <section className="app-screen-card space-y-5 text-center">
      <p className="app-kicker">{checkoutFailed ? "Checkout complete" : "Resume recovery"}</p>
      <h1 className="text-3xl app-heading">
        {checkoutFailed
          ? "Your payment was successful, but we couldn’t reload the generated materials automatically."
          : "We couldn’t reload the generated materials automatically."}
      </h1>
      <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
        {checkoutFailed
          ? "Your credits should still be attached to your account. You can reopen saved materials from the dashboard or start a new application."
          : "If you just signed in, your account is ready. Reopen saved materials from the dashboard or start a new application."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href="/dashboard" className="app-button-primary">
          Go to dashboard
        </a>
        <button type="button" onClick={onRestart} className="app-button-ghost">
          Start a new application
        </button>
      </div>
    </section>
  );
}

