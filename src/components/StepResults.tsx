"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCOUNT_CREDITS_REFRESH_EVENT } from "@/components/AccountCreditIndicator";
import { inferJobMeta } from "@/lib/applicationMeta";
import { sanitizeGeneratedText } from "@/lib/sanitizeGeneratedText";
import { limitSkillsSection } from "@/lib/skillsSection";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SuccessGraphic } from "@/components/VisualDecor";
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
  onRestart: () => void;
}

// PDF layout constants (points; 72pt = 1 inch, US Letter).
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54; // 0.75"
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const FS_BODY = 10;
const FS_META = 9;
const FS_SECTION = 10.5;
const FS_NAME = 20;
const FS_TITLE = 12;
const FS_LETTER_BODY = 11;

const LH_BODY = 12.8;
const LH_LETTER = 15;
const LH_BULLET_GAP = 1.8;

const SECTION_NAMES = new Set([
  "summary",
  "experience",
  "work experience",
  "professional experience",
  "education",
  "key skills",
  "skills",
  "core skills",
  "technical skills",
  "tools",
  "tool stack",
  "certifications"
]);

const SAVED_RESULTS_KEY = "ats-resume-app:last-results";
const CHECKOUT_SNAPSHOT_KEY = "ats-resume-app:checkout-snapshot";
const PENDING_SAVE_NEXT = "/?step=results&save=1";
const AUTH_SAVE_NEXT = encodeURIComponent(PENDING_SAVE_NEXT);
const PENDING_UNLOCK_KEY = "ats-resume-app:pending-unlock";

type UnlockTarget = "resume" | "coverLetter";
type UnlockMode = "consume" | "purchase";
type UnlockResult = "unlocked" | "insufficient" | "auth" | "error";
type AccountStatus = {
  signedIn: boolean;
  credits: number;
  email?: string | null;
};

export default function StepResults({ state, onRestart }: Props) {
  const savedMeta = readSavedResultMeta();
  const [tailoredResume, setTailoredResume] = useState(
    sanitizeGeneratedText(state.tailoredResume)
  );
  const [tailoredCoverLetter, setTailoredCoverLetter] = useState(
    sanitizeGeneratedText(state.tailoredCoverLetter)
  );
  const [atsReport, setAtsReport] = useState(state.atsReport);
  const [finalAnalysis, setFinalAnalysis] = useState<
    AnalysisResult | undefined
  >(state.finalAnalysis);
  const [blockerAnswers, setBlockerAnswers] = useState<Record<string, string>>(
    {}
  );
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenAttempts, setRegenAttempts] = useState(0);
  const [lastRetrySignature, setLastRetrySignature] = useState("");
  const [resolvedBlockerIds, setResolvedBlockerIds] = useState<Set<string>>(
    () => new Set()
  );
  const hasSavedOutput = typeof savedMeta?.savedOutputId === "string";
  const [unlockedResume, setUnlockedResume] = useState(
    Boolean(hasSavedOutput && savedMeta?.unlockedResume)
  );
  const [unlockedCoverLetter, setUnlockedCoverLetter] = useState(
    Boolean(hasSavedOutput && savedMeta?.unlockedCoverLetter)
  );
  const [unlockTarget, setUnlockTarget] = useState<UnlockTarget | null>(null);
  const [unlockMode, setUnlockMode] = useState<UnlockMode>("purchase");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [interviewPromptOpen, setInterviewPromptOpen] = useState(false);
  const [checkoutReturned, setCheckoutReturned] = useState(false);
  const [checkoutCreditMessage, setCheckoutCreditMessage] = useState<string | null>(null);
  const [savedOutputId, setSavedOutputId] = useState<string | null>(
    typeof savedMeta?.savedOutputId === "string" ? savedMeta.savedOutputId : null
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "signin" | "error">("idle");
  const [applicationTitle, setApplicationTitle] = useState(() =>
    savedMeta?.applicationTitle ?? buildDefaultApplicationTitle(state.jobPostText)
  );
  const [authStatus, setAuthStatus] = useState<"checking" | "signed-in" | "anonymous">("checking");
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);

  const rawBlockers = getAtsBlockers(
    atsReport,
    `${state.resumeText}\n\n${tailoredResume}`
  );
  const blockers = rawBlockers.filter(
    (blocker) => !resolvedBlockerIds.has(blocker.id)
  );
  const passed =
    atsReport.length > 0 && atsReport.every((r) => r.passed);
  const blocked = blockers.length > 0;
  const showAnonymousSavePrompt =
    !blocked &&
    authStatus === "anonymous" &&
    !savedOutputId &&
    saveStatus !== "saving" &&
    !savePromptDismissed;

  useEffect(() => {
    if (!tailoredResume || !tailoredCoverLetter) return;
    try {
      window.sessionStorage.setItem(
        SAVED_RESULTS_KEY,
        JSON.stringify({
          ...state,
          tailoredResume,
          tailoredCoverLetter,
          atsReport,
          finalAnalysis,
          applicationTitle,
          savedOutputId,
          unlockedResume,
          unlockedCoverLetter,
          revisionPass: state.revisionPass
        })
      );
    } catch {
      // Session continuity is best-effort only until account storage exists.
    }
  }, [applicationTitle, atsReport, finalAnalysis, savedOutputId, state, tailoredCoverLetter, tailoredResume, unlockedCoverLetter, unlockedResume]);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setAuthStatus("anonymous");
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthStatus(data.user && data.user.is_anonymous !== true && data.user.email ? "signed-in" : "anonymous");
    }).catch(() => {
      if (active) setAuthStatus("anonymous");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutReturned(true);
      params.delete("checkout");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      void completePendingUnlockAfterCheckout();
    }

    if (params.get("unlock") === "1") {
      params.delete("unlock");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      const pending = readPendingUnlockTarget();
      if (pending) void requestUnlock(pending);
    }

    if (params.get("save") === "1") {
      params.delete("save");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      void handlePostAuthSave();
    }
    // Run once on entry so auth redirects can resume the pending save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !savePromptDismissed ||
      savedOutputId ||
      blocked ||
      !tailoredResume ||
      !tailoredCoverLetter
    ) {
      return;
    }
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Your generated materials are not saved yet.";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [blocked, savePromptDismissed, savedOutputId, tailoredCoverLetter, tailoredResume]);

  async function requestUnlock(target: UnlockTarget) {
    setUnlockError(null);
    setCheckoutCreditMessage(null);

    let outputId = savedOutputId;
    if (!outputId) {
      const saved = await saveCurrentOutput(false);
      if (saved.status === "saved") {
        outputId = saved.id;
      } else if (saved.status === "signin") {
        persistCurrentResultsSnapshot();
        window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
        setSaveStatus("signin");
        window.location.href = `/auth?next=${encodeURIComponent("/?step=results&unlock=1")}`;
        return;
      } else {
        setSaveStatus("error");
        setUnlockError("We could not prepare this material for unlocking. Please try again.");
        return;
      }
    }

    persistCurrentResultsSnapshot(outputId);
    const account = await fetchFreshAccountStatus();
    if (!account.signedIn) {
      window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
      window.location.href = `/auth?next=${encodeURIComponent("/?step=results&unlock=1")}`;
      return;
    }
    setUnlockMode(account.credits > 0 ? "consume" : "purchase");
    setUnlockTarget(target);
  }

  async function confirmUnlock() {
    const target = unlockTarget;
    if (!target) return;
    let outputId = savedOutputId;
    setUnlockBusy(true);
    setUnlockError(null);
    try {
      if (!outputId) {
        const saved = await saveCurrentOutput(false);
        if (saved.status === "saved") {
          outputId = saved.id;
        } else if (saved.status === "signin") {
          persistCurrentResultsSnapshot();
          window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
          window.location.href = `/auth?next=${encodeURIComponent("/?step=results&unlock=1")}`;
          return;
        } else {
          setUnlockError("We could not prepare this material for unlocking. Please try again.");
          return;
        }
      }

      persistCurrentResultsSnapshot(outputId);
      if (unlockMode === "purchase") {
        window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
        window.location.href = "/pricing";
        return;
      }

      const account = await fetchFreshAccountStatus();
      if (!account.signedIn) {
        window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
        window.location.href = `/auth?next=${encodeURIComponent("/?step=results&unlock=1")}`;
        return;
      }
      if (account.credits <= 0) {
        setUnlockMode("purchase");
        setUnlockError("No credits are available yet. You can buy credits to unlock this material.");
        return;
      }

      const unlocked = await persistUnlock(outputId, target);
      if (unlocked === "unlocked") {
        applyUnlock(target, outputId);
        return;
      }
      if (unlocked === "insufficient") {
        setUnlockMode("purchase");
        setUnlockError("Your credit balance changed. Buy credits to unlock this material.");
        return;
      }
      if (unlocked === "auth") {
        window.sessionStorage.setItem(PENDING_UNLOCK_KEY, target);
        window.location.href = `/auth?next=${encodeURIComponent("/?step=results&unlock=1")}`;
        return;
      }
      setUnlockError("We could not unlock this material yet. Please try again.");
    } finally {
      setUnlockBusy(false);
    }
  }

  async function completePendingUnlockAfterCheckout() {
    const pending = readPendingUnlockTarget();
    if (!pending || !savedOutputId) return;
    setCheckoutCreditMessage(
      "Payment received. Credits may take a few seconds to appear. Refreshing..."
    );
    const creditsReady = await waitForCreditsAfterCheckout();
    if (!creditsReady) {
      window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
      return;
    }
    const unlocked = await persistUnlock(savedOutputId, pending);
    if (unlocked === "unlocked") {
      applyUnlock(pending, savedOutputId);
      setCheckoutCreditMessage(null);
      return;
    }
    if (unlocked === "insufficient") {
      setCheckoutCreditMessage(
        "Payment received. Credits may take a few seconds to appear. Refreshing..."
      );
      window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
      return;
    }
    setCheckoutCreditMessage("Checkout completed, but we could not finish the unlock automatically. Please try again.");
  }

  function applyUnlock(target: UnlockTarget, outputId: string) {
    const nextResumeUnlocked = target === "resume" ? true : unlockedResume;
    const nextCoverUnlocked = target === "coverLetter" ? true : unlockedCoverLetter;
    if (target === "resume") setUnlockedResume(true);
    if (target === "coverLetter") setUnlockedCoverLetter(true);
    setUnlockTarget(null);
    setUnlockError(null);
    window.sessionStorage.removeItem(PENDING_UNLOCK_KEY);
    persistCurrentResultsSnapshot(outputId, {
      unlockedResume: nextResumeUnlocked,
      unlockedCoverLetter: nextCoverUnlocked
    });
    window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
    setInterviewPromptOpen(true);
  }

  async function handleSave(redirectToAuth = true) {
    const result = await saveCurrentOutput(true);
    if (result.status === "saved") return;
    if (result.status === "signin" && redirectToAuth) {
      setSavePromptDismissed(false);
    }
  }

  async function handlePostAuthSave() {
    const result = await saveCurrentOutput(true);
    if (result.status === "saved") {
      window.location.href = `/outputs/${result.id}`;
    }
  }

  async function saveCurrentOutput(markSaving: boolean) {
    if (!tailoredResume || !tailoredCoverLetter || blocked) return { status: "error" as const };
    if (markSaving) setSaveStatus("saving");
    const normalizedTitle = normalizeApplicationTitle(applicationTitle, state.jobPostText);
    setApplicationTitle(normalizedTitle);
    const result = await saveOutputForAccount({
      resumeText: tailoredResume,
      coverLetterText: tailoredCoverLetter,
      applicationTitle: normalizedTitle,
      state
    });
    if (result.status === "saved") {
      setSavedOutputId(result.id);
      setSaveStatus("saved");
      persistCurrentResultsSnapshot(result.id);
      return result;
    }
    if (result.status === "signin") {
      setSaveStatus("signin");
      return result;
    }
    setSaveStatus("error");
    return result;
  }

  function persistCurrentResultsSnapshot(
    nextSavedOutputId = savedOutputId,
    unlocks?: { unlockedResume?: boolean; unlockedCoverLetter?: boolean }
  ) {
    if (!tailoredResume || !tailoredCoverLetter) return;
    const payload = JSON.stringify({
      ...state,
      tailoredResume,
      tailoredCoverLetter,
      atsReport,
      finalAnalysis,
      applicationTitle: normalizeApplicationTitle(applicationTitle, state.jobPostText),
      savedOutputId: nextSavedOutputId,
      unlockedResume: unlocks?.unlockedResume ?? unlockedResume,
      unlockedCoverLetter: unlocks?.unlockedCoverLetter ?? unlockedCoverLetter,
      revisionPass: state.revisionPass
    });
    window.sessionStorage.setItem(SAVED_RESULTS_KEY, payload);
    window.sessionStorage.setItem(CHECKOUT_SNAPSHOT_KEY, payload);
  }

  async function handleResolveBlockers() {
    if (!state.analysis || blockers.length === 0) return;
    const answered = blockers.filter((blocker) =>
      blockerAnswers[blocker.id]?.trim()
    );
    if (answered.length === 0) {
      setRegenError("Add the missing details before re-running the final resume check.");
      return;
    }
    const retrySignature = answered
      .map((blocker) => `${blocker.id}:${blockerAnswers[blocker.id].trim()}`)
      .join("|");
    if (regenAttempts >= 2 && retrySignature === lastRetrySignature) {
      setRegenError(
        "Safe retry limit reached. Please edit the resume details directly or start over with a more complete original resume."
      );
      return;
    }

    setRegenerating(true);
    setRegenError(null);
    setLastRetrySignature(retrySignature);
    try {
      const patches = answered.map((blocker) =>
        formatMissingFieldPatch(blocker, blockerAnswers[blocker.id].trim())
      );

      const patchFollowUps = answered.map((blocker) => ({
        id: `ats-blocker-${blocker.id}`,
        requirementId: blocker.id,
        question: blocker.question,
        answer: normalizePatchAnswer(blocker, blockerAnswers[blocker.id].trim())
      }));

      const patchedResumeText = applyMissingFieldPatches(
        state.resumeText.trim(),
        answered,
        blockerAnswers
      );

      const resumeText = `${patchedResumeText}

ATS-CRITICAL FIELD PATCHES
${patches.join("\n\n")}`;

      const gen = await postJson<GenerateResponse>("/api/generate", {
        resumeText,
        jobPostText: state.jobPostText,
        analysis: state.analysis,
        followUps: [...state.followUps, ...patchFollowUps]
      });
      const nextResume = sanitizeGeneratedText(
        applyMissingFieldPatches(
          limitSkillsSection(gen.resume),
          answered,
          blockerAnswers
        )
      );
      const resolvedAfterPatch = answered.filter((blocker) =>
        isPatchPresentInText(
          nextResume,
          blocker,
          blockerAnswers[blocker.id]?.trim() ?? ""
        )
      );

      const check = await postJson<CheckResponse>("/api/check", {
        resume: nextResume,
        coverLetter: sanitizeGeneratedText(gen.coverLetter),
        jobPostText: state.jobPostText,
        analysis: state.analysis
      });
      const nextUnresolved = getAtsBlockers(
        check.report,
        `${resumeText}\n\n${nextResume}`
      ).filter(
        (blocker) =>
          !resolvedAfterPatch.some((resolved) => resolved.id === blocker.id)
      );
      const beforeIds = blockers.map((blocker) => blocker.id).join("|");
      const afterIds = nextUnresolved.map((blocker) => blocker.id).join("|");
      if (beforeIds && beforeIds === afterIds) {
        console.warn("[StepResults] ATS blockers unchanged after patch", {
          before: blockers,
          after: nextUnresolved
        });
      }

      let nextFinalAnalysis: AnalysisResult | undefined = finalAnalysis;
      try {
        const rescore = await postJson<RescoreResponse>("/api/rescore", {
          resumeText: nextResume,
          jobPostText: state.jobPostText,
          baseline: state.analysis,
          followUps: [...state.followUps, ...patchFollowUps]
        });
        nextFinalAnalysis = rescore.analysis;
      } catch (err) {
        console.warn("[StepResults] /api/rescore failed", err);
      }

      setTailoredResume(nextResume);
      setTailoredCoverLetter(sanitizeGeneratedText(gen.coverLetter));
      setAtsReport(check.report);
      setFinalAnalysis(nextFinalAnalysis);
      if (resolvedAfterPatch.length > 0) {
        setResolvedBlockerIds((current) => {
          const next = new Set(current);
          for (const blocker of resolvedAfterPatch) next.add(blocker.id);
          return next;
        });
      }
      setRegenAttempts((attempts) => attempts + 1);
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Could not re-run the final resume check."
      );
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="app-screen-card space-y-5">
        <div className="app-feature-panel grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="app-kicker">Results</p>
            <h2 className="mt-2 text-3xl app-heading">
              {blocked
                ? "Let\u2019s fill in a few missing details"
                : "Your tailored materials are ready"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/75">
              {blocked
                ? "We found a few ATS-critical details missing from your resume. Add only the missing information below and we\u2019ll update the resume before export."
                : "Resume and cover letter rewritten around your real experience, with ATS-friendly formatting applied."}
            </p>
          </div>
          <SuccessGraphic className="mx-auto hidden md:block" />
        </div>

        {(checkoutReturned || checkoutCreditMessage) && (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            {checkoutCreditMessage ??
              "Checkout complete. We’re refreshing your credits and restoring your requested unlock."}
          </div>
        )}

        {saveStatus === "saved" && (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Saved to your dashboard as “{applicationTitle}”.
          </div>
        )}
        {saveStatus === "error" && (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            We could not save this resume yet. Please try again in a moment.
          </div>
        )}

        {!blocked && <AtsTrustCard passed={passed} report={atsReport} />}
        {showAnonymousSavePrompt && (
          <AnonymousSavePrompt
            onContinue={() => setSavePromptDismissed(true)}
          />
        )}

      {blocked ? (
        <AtsBlockerForm
          blockers={blockers}
          answers={blockerAnswers}
          onAnswerChange={(id, answer) => {
            setBlockerAnswers((current) => ({ ...current, [id]: answer }));
            setRegenAttempts(0);
            setLastRetrySignature("");
            setRegenError(null);
          }}
          onSubmit={handleResolveBlockers}
          busy={regenerating}
          error={regenError}
        />
      ) : (
        <>
          <SaveAsPanel
            title={applicationTitle}
            saved={saveStatus === "saved"}
            saving={saveStatus === "saving"}
            onTitleChange={(title) => {
              setApplicationTitle(title);
            }}
            onSave={() => handleSave(true)}
          />
          <div className="grid gap-5 xl:grid-cols-2">
            <ResumePanel
              title="Tailored Resume"
              text={tailoredResume}
              downloadName={`${filenameFromTitle(applicationTitle)}-resume`}
              pdfKind="resume"
              locked={!unlockedResume}
              lockMode="resume"
              allowCopy={unlockedResume}
              allowDownloads={unlockedResume}
              upgradeLabel="Unlock resume export - 1 credit"
              onRequestUnlock={() => requestUnlock("resume")}
              variationLabel="Regenerate resume"
              variationOptions={[
                "More concise",
                "More confident",
                "More corporate",
                "More metrics-focused",
                "More customer-success focused",
                "More leadership-focused"
              ]}
            />

            <ResumePanel
              title="Cover Letter"
              text={tailoredCoverLetter}
              downloadName={`${filenameFromTitle(applicationTitle)}-cover-letter`}
              pdfKind="coverLetter"
              headerSource={tailoredResume}
              locked={!unlockedCoverLetter}
              lockMode="coverLetter"
              allowCopy={unlockedCoverLetter}
              allowDownloads={unlockedCoverLetter}
              upgradeLabel="Unlock full cover letter - 1 credit"
              onRequestUnlock={() => requestUnlock("coverLetter")}
              variationLabel="Regenerate cover letter"
              variationOptions={[
                "Warmer",
                "More direct",
                "More concise",
                "More confident",
                "More company-specific"
              ]}
            />
          </div>
        </>
      )}
      {!blocked && (unlockedResume || unlockedCoverLetter) && <InterviewPrepCard />}
      </div>

      {unlockTarget && (
        <UnlockModal
          target={unlockTarget}
          mode={unlockMode}
          busy={unlockBusy}
          error={unlockError}
          onCancel={() => setUnlockTarget(null)}
          onConfirm={confirmUnlock}
        />
      )}

      {interviewPromptOpen && (unlockedResume || unlockedCoverLetter) && (
        <InterviewPrepUpsellModal onClose={() => setInterviewPromptOpen(false)} />
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="app-button-secondary"
        >
          Start over
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final resume check banner
// ---------------------------------------------------------------------------

function AtsTrustCard({
  passed,
  report
}: {
  passed: boolean;
  report: SessionState["atsReport"];
}) {
  const notes = buildRecruiterVisibilityNotes(report);
  if (report.length === 0) {
    return (
      <div className="app-card-soft">
        <p className="app-kicker">
          Final resume check
        </p>
        <h3 className="mt-2 text-xl app-heading">
          Tailored materials generated
        </h3>
        <p className="mt-2 text-sm text-[var(--color-text-primary)]/75">
          Your resume and cover letter are ready to review.
        </p>
      </div>
    );
  }
  const hasMajorStructureIssue = report.some(
    (rule) =>
      !rule.passed &&
      /standard section headings|parseable work history|ats-friendly formatting|no exotic structure/i.test(
        rule.rule
      )
  );
  return (
    <div
      className={`app-card-soft border text-sm ${
        passed
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-orange-200 bg-orange-50 text-orange-900"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider">
        Final resume check
      </p>
      <h3 className="mt-2 text-xl app-heading">
        {passed ? "Resume ready to use" : "Recruiter visibility notes"}
      </h3>
      <p className="mt-2 text-sm">
        {passed
          ? "Your resume is structured cleanly and includes several relevant signals for this role."
          : hasMajorStructureIssue
            ? "Your resume is usable, but the final version may be stronger if you add more detail around the role-specific items below."
            : "Your resume is ready to use, with a few optional refinements that could improve visibility."}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SaveAsPanel({
  title,
  saved,
  saving,
  onTitleChange,
  onSave
}: {
  title: string;
  saved: boolean;
  saving: boolean;
  onTitleChange: (title: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border-light)] bg-white p-4 shadow-[var(--shadow-inset-soft)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="app-kicker">Application title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={saved}
            className="app-input mt-2"
            placeholder="Name this application"
          />
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className={saved ? "app-button-secondary px-6 py-3" : "app-button-primary px-6 py-3"}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save to dashboard"}
        </button>
      </div>
      {!saved && (
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          This title will appear on dashboard cards, saved materials, search,
          and export filenames.
        </p>
      )}
    </div>
  );
}

function AnonymousSavePrompt({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#d9e3ed] bg-white p-4 shadow-[var(--shadow-inset-soft)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="app-kicker">Save your progress</p>
          <h3 className="mt-2 text-xl app-heading">
            Create a free account to save this application and come back later.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            You can keep reviewing the resume preview and blurred cover letter
            without saving. An account is only needed for saving, unlocking,
            exporting, buying credits, and dashboard access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link
            href={`/auth?mode=sign-up&next=${AUTH_SAVE_NEXT}`}
            className="app-button-primary px-5 py-2.5 text-sm"
          >
            Create account
          </Link>
          <Link
            href={`/auth?mode=sign-in&next=${AUTH_SAVE_NEXT}`}
            className="app-button-ghost px-5 py-2.5 text-sm"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onContinue}
            className="px-5 py-2.5 text-sm font-bold text-[var(--color-text-muted)]"
          >
            Continue without saving
          </button>
        </div>
      </div>
    </div>
  );
}

function buildRecruiterVisibilityNotes(report: SessionState["atsReport"]): string[] {
  const notes: string[] = [];
  const hasRule = (pattern: RegExp, passed?: boolean) =>
    report.some((rule) => pattern.test(rule.rule) && (passed === undefined || rule.passed === passed));

  if (
    hasRule(/standard section headings|parseable work history|parseable education|parseable skills|clean date formatting/i, true)
  ) {
    notes.push("Core resume sections are structured in a way recruiters and ATS systems can scan.");
  }

  if (hasRule(/keyword coverage/i, true)) {
    notes.push("Several role-relevant signals are visible in the tailored resume.");
  } else if (hasRule(/keyword coverage/i, false)) {
    const safeGap = recruiterSafeKeywordGap(report.find((rule) => /keyword coverage/i.test(rule.rule))?.detail);
    notes.push(safeGap ?? "A few role-specific platform or responsibility signals may be worth strengthening before applying.");
  }

  if (hasRule(/parseable work history/i, false)) {
    notes.push("Work history may be stronger with clearer role details, dates, or bullet structure.");
  }
  if (hasRule(/parseable education|clean date formatting/i, false)) {
    notes.push("Adding clean education or work date details can improve readability.");
  }
  if (hasRule(/ats-friendly formatting|no exotic structure|standard section headings/i, false)) {
    notes.push("Keeping the final resume in simple single-column formatting will protect readability.");
  }

  if (notes.length === 0) {
    notes.push("Your resume is structured cleanly and ready for review.");
    notes.push("Client communication, workflow, and role-alignment signals should remain easy to scan.");
  }

  return [...new Set(notes)].slice(0, 4);
}

function recruiterSafeKeywordGap(detail?: string): string | null {
  if (!detail) return null;
  const missing = detail.match(/Missing:\s*(.+?)\.?$/i)?.[1] ?? "";
  const terms = missing
    .split(",")
    .map((term) => cleanReviewTerm(term))
    .filter((term) => term && isRecruiterRelevantReviewTerm(term));

  if (terms.some((term) => /facebook|meta/i.test(term))) {
    return "Direct Facebook or Meta advertising language is still limited unless confirmed in your answers.";
  }
  if (terms.some((term) => /\bcrm\b|client notes|pipeline|documentation/i.test(term))) {
    return "CRM, client documentation, or follow-up system language may be worth strengthening.";
  }
  if (terms.some((term) => /dashboard|report|kpi|metric|performance|analytics/i.test(term))) {
    return "Campaign reporting, KPI, or performance-tracking language may be worth strengthening.";
  }
  if (terms.some((term) => /onboard|train|client|customer|communication/i.test(term))) {
    return "Client communication and onboarding signals may be worth making more explicit.";
  }
  return terms.length > 0
    ? "A few role-specific skill or responsibility signals may be worth strengthening before applying."
    : null;
}

function cleanReviewTerm(term: string): string {
  return term
    .replace(/â€¦|…/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecruiterRelevantReviewTerm(term: string): boolean {
  if (!term || term.length < 3) return false;
  return !/\b(?:don'?t want|do not want|struggle with|slow-paced|salary|benefits?|location|mississauga|ontario|canada|join us|mission|values?|culture|inclusive|diversity|equal opportunity|people leader|vp product|full-time|temporary|contract)\b/i.test(
    term
  );
}

type AtsBlocker = {
  id: string;
  type: "education" | "experience";
  label: string;
  question: string;
  expectedAnswerType: "year" | "date_range" | "short_text";
  knownFields: {
    school?: string;
    program?: string;
    credential?: string;
    company?: string;
    role?: string;
  };
  missingFields: string[];
  detail?: string;
};

type ResumeSection = "header" | "summary" | "experience" | "education" | "skills" | "other";

type ExperienceContext = {
  knownFields: AtsBlocker["knownFields"];
  confidenceScore: number;
};

function AtsBlockerForm({
  blockers,
  answers,
  onAnswerChange,
  onSubmit,
  busy,
  error
}: {
  blockers: AtsBlocker[];
  answers: Record<string, string>;
  onAnswerChange: (id: string, answer: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="app-card-warm space-y-4">
      <div className="space-y-3">
        {blockers.map((blocker) => (
          <label key={blocker.id} className="block space-y-2">
            <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
              {blocker.label}
            </span>
            <span className="block text-sm text-[var(--color-text-primary)]/80">
              {blocker.question}
            </span>
            {blocker.detail && (
              <span className="block text-xs text-[var(--color-text-primary)]/55">
                ATS note: {blocker.detail}
              </span>
            )}
            <textarea
              value={answers[blocker.id] ?? ""}
              onChange={(event) =>
                onAnswerChange(blocker.id, event.target.value)
              }
              className="app-input min-h-[96px] resize-y leading-6"
              placeholder={placeholderForBlocker(blocker)}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-[var(--radius-card)] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 shadow-[var(--shadow-card)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="app-button-primary inline-flex items-center gap-2"
      >
        {busy && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
        )}
        {busy ? "Re-running final check..." : "Update and re-run final check"}
      </button>
    </div>
  );
}

function getAtsBlockers(report: AtsRuleResult[], sourceText: string): AtsBlocker[] {
  const educationContext = extractEducationContext(sourceText);
  const experienceContexts = extractExperienceContexts(sourceText);

  return report.flatMap((rule) => {
    if (rule.passed) return [];
    const detail = rule.detail ?? "";
    if (rule.rule === "Clean date formatting") {
      return buildExperienceBlockers(
        "work-dates",
        detail,
        experienceContexts,
        ["startDate", "endDate"]
      );
    }
    if (rule.rule === "Parseable work history") {
      return buildExperienceBlockers(
        "work-history",
        detail,
        experienceContexts,
        /date/i.test(detail) ? ["startDate", "endDate"] : ["experienceSection"]
      );
    }
    if (rule.rule === "Parseable education") {
      const missingFields = missingEducationFields(detail, educationContext);
      const blocker: AtsBlocker = {
        id: "education",
        type: "education",
        label: "Education date",
        knownFields: educationContext,
        missingFields,
        expectedAnswerType: missingFields.includes("dateRange")
          ? "date_range"
          : "year",
        question: generateMissingDetailQuestion({
          type: "education",
          knownFields: educationContext,
          missingFields
        }),
        detail
      };
      return [blocker];
    }
    return [];
  });
}

function buildExperienceBlockers(
  idPrefix: string,
  detail: string,
  contexts: ExperienceContext[],
  missingFields: string[]
): AtsBlocker[] {
  const targets = contexts
    .filter((context) => context.confidenceScore > 0.7)
    .slice(0, 3);

  if (targets.length === 0) {
    return [
      {
        id: `${idPrefix}-section`,
        type: "experience",
        label: "Work history section",
        knownFields: {},
        missingFields,
        expectedAnswerType: "short_text",
        question:
          "Which real work experience roles and dates should appear in your resume?",
        detail
      }
    ];
  }

  return targets.map(({ knownFields }, index) => ({
    id: `${idPrefix}-${index}`,
    type: "experience",
    label:
      knownFields.role || knownFields.company
        ? [knownFields.role, knownFields.company].filter(Boolean).join(" at ")
        : "Work history dates",
    knownFields,
    missingFields,
    expectedAnswerType: missingFields.includes("startDate")
      ? "date_range"
      : "short_text",
    question: generateMissingDetailQuestion({
      type: "experience",
      knownFields,
      missingFields
    }),
    detail
  }));
}

function missingEducationFields(
  detail: string,
  knownFields: AtsBlocker["knownFields"]
): string[] {
  const lowered = detail.toLowerCase();
  const missing: string[] = [];
  if (/year/.test(lowered)) missing.push("completionYear");
  if (/institution/.test(lowered) && !knownFields.school) missing.push("school");
  if (/degree|credential|field/.test(lowered) && !knownFields.program) {
    missing.push("program");
  }
  return missing.length > 0 ? missing : ["completionYear"];
}

function generateMissingDetailQuestion(gap: Pick<AtsBlocker, "type" | "knownFields" | "missingFields">): string {
  const { knownFields, missingFields } = gap;

  if (gap.type === "education") {
    const school = knownFields.school;
    const program = knownFields.program;
    const needsRange = missingFields.includes("dateRange");
    if (school && program && needsRange) {
      return `What years did you attend ${program} at ${school}?`;
    }
    if (school && program) {
      return `What year did you complete ${program} at ${school}?`;
    }
    if (school) {
      return `What year did you complete your program at ${school}?`;
    }
    if (program) {
      return `What year did you complete ${program}?`;
    }
    return "What year did you complete this education program?";
  }

  const company = knownFields.company;
  const role = knownFields.role;
  if (role && company && missingFields.some((field) => /date/i.test(field))) {
    return `What were your start and end dates for your ${role} role at ${company}?`;
  }
  if (company && missingFields.some((field) => /date/i.test(field))) {
    return `What dates did you work at ${company}?`;
  }
  if (role && missingFields.some((field) => /date/i.test(field))) {
    return `What dates did you work as ${role}?`;
  }
  return "What dates should we use for the work experience roles you want included?";
}

function placeholderForBlocker(blocker: AtsBlocker): string {
  if (blocker.expectedAnswerType === "year") return "Example: 2018";
  if (blocker.expectedAnswerType === "date_range") {
    return "Example: Jan 2021 - Mar 2024, or 2023 - Present";
  }
  return "Add only the missing detail requested above.";
}

function formatMissingFieldPatch(blocker: AtsBlocker, answer: string): string {
  const normalizedAnswer = normalizePatchAnswer(blocker, answer);
  const known = Object.entries(blocker.knownFields)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `  known ${key}: ${value}`)
    .join("\n");
  const target =
    blocker.type === "education"
      ? [blocker.knownFields.program, blocker.knownFields.school]
          .filter(Boolean)
          .join(" at ") || "education entry"
      : [blocker.knownFields.role, blocker.knownFields.company]
          .filter(Boolean)
          .join(" at ") || "work history entry";

  return [
    `- type: ${blocker.type}`,
    `  target: ${target}`,
    known,
    `  missing fields: ${blocker.missingFields.join(", ")}`,
    `  value provided: ${normalizedAnswer}`,
    "  instruction: Update only these missing fields on the matching resume entry. Do not create a duplicate entry or rewrite unrelated history."
  ]
    .filter(Boolean)
    .join("\n");
}

function applyMissingFieldPatches(
  text: string,
  blockers: AtsBlocker[],
  answers: Record<string, string>
): string {
  return blockers.reduce((current, blocker) => {
    const answer = normalizePatchAnswer(blocker, answers[blocker.id]?.trim() ?? "");
    if (!answer) return current;
    if (blocker.type === "education") {
      return patchEducationEntry(current, blocker, answer);
    }
    if (blocker.type === "experience") {
      return patchExperienceEntry(current, blocker, answer);
    }
    return current;
  }, text);
}

function isBlockerSatisfied(blocker: AtsBlocker, answer?: string): boolean {
  const normalized = normalizePatchAnswer(blocker, answer?.trim() ?? "");
  if (!normalized) return false;
  if (blocker.missingFields.some((field) => /date/i.test(field))) {
    return hasNormalizedDateRange(normalized);
  }
  if (blocker.missingFields.includes("completionYear")) {
    return /\b(19|20)\d{2}\b/.test(normalized);
  }
  return normalized.length > 0;
}

function isPatchPresentInText(
  text: string,
  blocker: AtsBlocker,
  answer: string
): boolean {
  const normalized = normalizePatchAnswer(blocker, answer);
  if (!isBlockerSatisfied(blocker, normalized)) return false;
  const lowered = text.toLowerCase();
  if (blocker.type === "education") {
    const hasAnswer = valueAppearsInText(lowered, normalized);
    const hasKnownTarget =
      Boolean(
        blocker.knownFields.program &&
          lowered.includes(blocker.knownFields.program.toLowerCase())
      ) ||
      Boolean(
        blocker.knownFields.school &&
          lowered.includes(blocker.knownFields.school.toLowerCase())
      );
    return hasAnswer && (hasKnownTarget || !blocker.knownFields.program);
  }
  if (blocker.type === "experience") {
    const hasAnswer =
      hasNormalizedDateRange(normalized) && valueAppearsInText(lowered, normalized);
    const hasKnownTarget =
      Boolean(
        blocker.knownFields.role &&
          lowered.includes(blocker.knownFields.role.toLowerCase())
      ) ||
      Boolean(
        blocker.knownFields.company &&
          lowered.includes(blocker.knownFields.company.toLowerCase())
      );
    return hasAnswer && (hasKnownTarget || (!blocker.knownFields.role && !blocker.knownFields.company));
  }
  return valueAppearsInText(lowered, normalized);
}

function valueAppearsInText(loweredText: string, value: string): boolean {
  if (!value) return false;
  const loweredValue = value.toLowerCase();
  if (loweredText.includes(loweredValue)) return true;
  const years = loweredValue.match(/\b(19|20)\d{2}\b/g);
  if (years && years.length > 0) {
    return years.every((year) => loweredText.includes(year));
  }
  return false;
}

function normalizePatchAnswer(blocker: AtsBlocker, answer: string): string {
  if (!answer) return "";
  if (
    blocker.expectedAnswerType === "date_range" ||
    blocker.missingFields.some((field) => /date/i.test(field))
  ) {
    return normalizeDateRangeAnswer(answer);
  }
  return answer.replace(/\s+/g, " ").trim();
}

function normalizeDateRangeAnswer(answer: string): string {
  const cleaned = answer
    .replace(/[â€“â€”]/g, "-")
    .replace(/\bto\b/gi, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  const years = cleaned.match(/\b(19|20)\d{2}\b/g);
  if (years && years.length >= 2) return `${years[0]} - ${years[1]}`;
  if (years && years.length === 1 && /\b(?:present|current)\b/i.test(cleaned)) {
    return `${years[0]} - Present`;
  }
  return cleaned;
}

function hasNormalizedDateRange(text: string): boolean {
  return /\b(19|20)\d{2}\b\s*(?:-|â€“|â€”|to)\s*(?:\b(19|20)\d{2}\b|Present|Current)/i.test(
    text
  );
}

function patchEducationEntry(text: string, blocker: AtsBlocker, answer: string): string {
  const school = blocker.knownFields.school;
  const program = blocker.knownFields.program;
  const lines = text.split("\n");
  const targetIndex = lines.findIndex((line) =>
    Boolean(program && line.toLowerCase().includes(program.toLowerCase()))
  );
  const schoolIndex = lines.findIndex((line) =>
    Boolean(school && line.toLowerCase().includes(school.toLowerCase()))
  );
  const index = targetIndex >= 0 ? targetIndex : schoolIndex;

  if (index >= 0) {
    lines[index] = addMissingValueToLine(lines[index], answer);
    return lines.join("\n");
  }

  return upsertEducationEntry(text, blocker, answer);
}

function patchExperienceEntry(text: string, blocker: AtsBlocker, answer: string): string {
  const role = blocker.knownFields.role;
  const company = blocker.knownFields.company;
  if (!role && !company) {
    return `${text.trim()}\n\nPROFESSIONAL EXPERIENCE\nWork history dates provided by candidate | ${answer}`;
  }

  const lines = text.split("\n");
  const index = lines.findIndex((line) => {
    const lowered = line.toLowerCase();
    return Boolean(
      (role && lowered.includes(role.toLowerCase())) ||
        (company && lowered.includes(company.toLowerCase()))
    );
  });

  if (index >= 0) {
    lines[index] = addMissingValueToLine(lines[index], answer);
    return lines.join("\n");
  }

  return `${text.trim()}\n\nPROFESSIONAL EXPERIENCE\n${[
    role,
    company,
    answer
  ]
    .filter(Boolean)
    .join(" | ")}`;
}

function addMissingValueToLine(line: string, answer: string): string {
  if (line.toLowerCase().includes(answer.toLowerCase())) return line;
  if (/\b(19|20)\d{2}\b/.test(answer) && /\b(19|20)\d{2}\b/.test(line)) {
    return line;
  }
  return `${line.replace(/\s+$/, "")}, ${answer}`;
}

function upsertEducationEntry(
  text: string,
  blocker: AtsBlocker,
  answer: string
): string {
  const lines = text.split("\n");
  const educationIndex = lines.findIndex((line) =>
    /^education\s*:?$/i.test(line.trim())
  );
  const entryLines = [
    [
      blocker.knownFields.program,
      blocker.knownFields.credential,
      answer
    ]
      .filter(Boolean)
      .join(", "),
    blocker.knownFields.school
  ].filter(Boolean) as string[];

  if (entryLines.length === 0) return text;

  if (educationIndex >= 0) {
    const insertAt = educationIndex + 1;
    return [
      ...lines.slice(0, insertAt),
      ...entryLines,
      ...lines.slice(insertAt)
    ].join("\n");
  }

  return `${text.trim()}\n\nEDUCATION\n${entryLines.join("\n")}`;
}

function extractEducationContext(text: string): AtsBlocker["knownFields"] {
  const sections = segmentResumeSections(text);
  const window =
    sections.education.length > 0
      ? sections.education
      : normalizedLines(text).filter((line) =>
          !isContactLine(line) &&
          /(University|College|Institute|School|Academy|Journalism|Multimedia|Diploma|Certificate|Degree)/i.test(
            line
          )
        );

  const schoolLine = window.find((line) =>
    /(University|College|Institute|School|Academy)/i.test(line)
  );
  const programLine = window.find((line) =>
    /(Journalism|Multimedia|Communications?|Media|Marketing|Business|Design|Diploma|Certificate|Degree)/i.test(
      line
    )
  );
  const credentialLine = window.find((line) =>
    /(Honou?rs?|Distinction|Diploma|Certificate|Degree|Bachelor|Master|Associate)/i.test(
      line
    )
  );

  return {
    school: schoolLine ? cleanKnownField(extractSchool(schoolLine)) : undefined,
    program: programLine
      ? cleanKnownField(extractProgram(programLine, schoolLine))
      : undefined,
    credential: credentialLine ? cleanKnownField(credentialLine) : undefined
  };
}

function extractExperienceContexts(text: string): ExperienceContext[] {
  const sections = segmentResumeSections(text);
  const lines =
    sections.experience.length > 0
      ? sections.experience
      : sections.other.filter((line) => !isLikelySkillPhrase(line));
  const contexts: ExperienceContext[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isContactLine(line) || isLikelySkillPhrase(line)) continue;
    if (!looksLikeRoleCompanyLine(line)) continue;

    const parsed = parseRoleCompanyLine(line);
    const previous = lines[i - 1];
    const next = lines[i + 1];
    const role = parsed.role ?? (previous && looksLikeRole(previous) ? previous : undefined);
    const company =
      parsed.company ?? (next && looksLikeCompany(next) ? next : undefined);
    const confidenceScore = scoreExperienceCandidate({
      line,
      role,
      company,
      nearbyText: [previous, next].filter(Boolean).join(" ")
    });

    if ((role || company) && confidenceScore > 0) {
      const key = `${role ?? ""}|${company ?? ""}`.toLowerCase();
      if (
        !contexts.some(
          (context) =>
            `${context.knownFields.role ?? ""}|${context.knownFields.company ?? ""}`.toLowerCase() === key
        )
      ) {
        contexts.push({
          knownFields: {
            role: role ? cleanKnownField(role) : undefined,
            company: company ? cleanKnownField(company) : undefined
          },
          confidenceScore
        });
      }
    }
  }

  return contexts
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5);
}

function normalizedLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/^[\s\-*â€¢]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .filter((line) => line.length <= 120);
}

function segmentResumeSections(text: string): Record<ResumeSection, string[]> {
  const sections: Record<ResumeSection, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    other: []
  };
  let current: ResumeSection = "header";
  let sawSection = false;

  for (const line of normalizedLines(text)) {
    const heading = sectionForHeading(line);
    if (heading) {
      current = heading;
      sawSection = true;
      continue;
    }
    if (isContactLine(line)) {
      sections.header.push(line);
      continue;
    }
    if (!sawSection && sections.header.length < 6) {
      sections.header.push(line);
      continue;
    }
    if (current === "experience" && isLikelySkillPhrase(line)) {
      sections.skills.push(line);
      continue;
    }
    sections[current].push(line);
  }

  return sections;
}

function sectionForHeading(line: string): ResumeSection | null {
  const normalized = line.toLowerCase().replace(/[:.\s]+$/, "");
  if (/^(summary|professional summary|profile)$/.test(normalized)) {
    return "summary";
  }
  if (/^(experience|work experience|professional experience|employment|employment history|work history|additional experience)$/.test(normalized)) {
    return "experience";
  }
  if (/^(education|academic background)$/.test(normalized)) {
    return "education";
  }
  if (/^(skills|technical skills|core skills|core competencies|competencies|tools)$/.test(normalized)) {
    return "skills";
  }
  return null;
}

function isContactLine(line: string): boolean {
  return (
    /@/.test(line) ||
    /\b(?:https?:\/\/|www\.|linkedin\.com|[a-z0-9-]+\.(?:com|ca|net|org|io))\b/i.test(line) ||
    /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/.test(line)
  );
}

function extractSchool(line: string): string {
  const match = line.match(
    /([A-Z][A-Za-z&.' -]+(?:University|College|Institute|School|Academy)[A-Za-z&.' -]*)/
  );
  return match?.[1] ?? line;
}

function extractProgram(line: string, schoolLine?: string): string {
  let program = line;
  if (schoolLine) {
    program = program.replace(extractSchool(schoolLine), "");
  }
  program = program
    .replace(/\b(?:Education|Academic Background)\b/gi, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\s*[-|,]\s*$/, "")
    .trim();
  return program || line;
}

function looksLikeRoleCompanyLine(line: string): boolean {
  if (isContactLine(line) || isLikelySkillPhrase(line)) return false;
  if (/\b(19|20)\d{2}\b/.test(line)) return true;
  if (/\s[-|]\s/.test(line) && !/^summary|skills|education$/i.test(line)) {
    return true;
  }
  return /\bat\b/i.test(line) && line.length <= 90;
}

function parseRoleCompanyLine(line: string): AtsBlocker["knownFields"] {
  const withoutDates = line
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\b/gi, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\b(?:Present|Current)\b/gi, "")
    .replace(/\s*(?:-|â€“|â€”|to)\s*$/g, "")
    .trim();

  const atMatch = withoutDates.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    const role = looksLikeRole(atMatch[1]) ? atMatch[1] : undefined;
    const company = looksLikeCompany(atMatch[2]) ? atMatch[2] : undefined;
    return { role, company };
  }

  const parts = withoutDates
    .split(/\s+[|â€“â€”-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const [first, second] = parts;
    if (looksLikeCompany(first) && !looksLikeCompany(second)) {
      return { company: first, role: looksLikeRole(second) ? second : undefined };
    }
    return {
      role: looksLikeRole(first) ? first : undefined,
      company: looksLikeCompany(second) ? second : undefined
    };
  }

  return looksLikeRole(withoutDates) ? { role: withoutDates } : {};
}

function scoreExperienceCandidate({
  line,
  role,
  company,
  nearbyText
}: {
  line: string;
  role?: string;
  company?: string;
  nearbyText: string;
}): number {
  if (isContactLine(line) || isLikelySkillPhrase(line)) return 0;
  let score = 0;
  if (role && looksLikeRole(role)) score += 0.35;
  if (company && looksLikeCompany(company)) score += 0.35;
  if (/\b(19|20)\d{2}\b/.test(line)) score += 0.25;
  if (hasActionEvidence(`${line} ${nearbyText}`)) score += 0.15;
  return Math.min(score, 1);
}

function isLikelySkillPhrase(line: string): boolean {
  if (/[,@]|\.(?:com|ca|net|org|io)\b/i.test(line)) return false;
  if (/\b(19|20)\d{2}\b/.test(line)) return false;
  if (/[,;]\s*/.test(line)) return true;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return false;
  const abstractSkill = /\b(?:management|coordination|strategy|development|communication|communications|growth|planning|operations|leadership|collaboration|sales|marketing|content|project|client|customer|business|relationship)\b/i.test(
    line
  );
  return abstractSkill && !hasCompanyMarker(line) && !/\b(?:manager|lead|director|representative|specialist|coordinator|consultant|founder|operator)\b/i.test(line);
}

function hasActionEvidence(text: string): boolean {
  return /\b(?:managed|led|created|developed|coordinated|delivered|built|owned|supported|improved|launched|produced|wrote|designed|implemented|trained|served|sold)\b/i.test(
    text
  );
}

function looksLikeRole(line: string): boolean {
  return /\b(?:Manager|Lead|Specialist|Coordinator|Consultant|Representative|Founder|Operator|Director|Assistant|Associate|Writer|Editor|Producer|Chef|Server|Sales|Customer|Marketing|Content)\b/i.test(
    line
  );
}

function looksLikeCompany(line: string): boolean {
  if (isContactLine(line)) return false;
  return hasCompanyMarker(line);
}

function hasCompanyMarker(line: string): boolean {
  return /\b(?:Inc\.?|Ltd\.?|LLC|Studio|Company|Co\.?|Agency|Hardware|Design|Restaurant|Services|Media|Group|Solutions)\b/i.test(line);
}

function cleanKnownField(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s*[|,]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function saveOutputForAccount(args: {
  resumeText: string;
  coverLetterText: string;
  applicationTitle: string;
  state: SessionState;
}): Promise<{ status: "saved"; id: string } | { status: "signin" | "error" }> {
  try {
    const res = await fetch("/api/outputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText: args.resumeText,
        coverLetterText: args.coverLetterText,
        applicationTitle: args.applicationTitle,
        sourceJobDescription: args.state.jobPostText,
        analysisSummary: args.state.analysis?.scoreSummary,
        clarificationAnswers: args.state.followUps,
        analysis: args.state.analysis
      })
    });
    if (res.status === 401 || res.status === 503) return { status: "signin" };
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as { id?: string };
    return data.id ? { status: "saved", id: data.id } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

function buildDefaultApplicationTitle(jobPostText: string) {
  const meta = inferJobMeta(jobPostText);
  if (meta.jobTitle && meta.companyName) return `${meta.jobTitle} - ${meta.companyName}`;
  if (meta.jobTitle) return meta.jobTitle;
  if (meta.companyName) return `${meta.companyName} Application`;
  return "Untitled application";
}

function normalizeApplicationTitle(title: string, jobPostText: string) {
  const trimmed = title.replace(/\s+/g, " ").trim();
  return trimmed || buildDefaultApplicationTitle(jobPostText);
}

function readSavedResultMeta() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SAVED_RESULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      applicationTitle?: unknown;
      savedOutputId?: unknown;
      unlockedResume?: unknown;
      unlockedCoverLetter?: unknown;
    };
    return {
      applicationTitle:
        typeof parsed.applicationTitle === "string" && parsed.applicationTitle.trim()
          ? parsed.applicationTitle.trim()
          : null,
      savedOutputId: parsed.savedOutputId,
      unlockedResume: parsed.unlockedResume,
      unlockedCoverLetter: parsed.unlockedCoverLetter
    };
  } catch {
    return null;
  }
}

function filenameFromTitle(title: string) {
  return (
    title
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "tailored-resume"
  );
}

async function persistUnlock(outputId: string, target: UnlockTarget): Promise<UnlockResult> {
  try {
    const response = await fetch(`/api/outputs/${outputId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target })
    });
    if (response.ok) return "unlocked";
    if (response.status === 402) return "insufficient";
    if (response.status === 401 || response.status === 503) return "auth";
    return "error";
  } catch (err) {
    console.warn("[StepResults] persist unlock failed", err);
    return "error";
  }
}

async function fetchFreshAccountStatus(): Promise<AccountStatus> {
  try {
    const response = await fetch("/api/account/status", { cache: "no-store" });
    if (!response.ok) return { signedIn: false, credits: 0 };
    const data = (await response.json()) as Partial<AccountStatus>;
    return {
      signedIn: Boolean(data.signedIn),
      credits: typeof data.credits === "number" ? data.credits : 0,
      email: typeof data.email === "string" ? data.email : null
    };
  } catch (err) {
    console.warn("[StepResults] account status refresh failed", err);
    return { signedIn: false, credits: 0 };
  }
}

async function waitForCreditsAfterCheckout() {
  for (const delayMs of [0, 1200, 1800, 2400, 3200, 4200, 5200]) {
    if (delayMs > 0) await delay(delayMs);
    window.dispatchEvent(new Event(ACCOUNT_CREDITS_REFRESH_EVENT));
    const account = await fetchFreshAccountStatus();
    if (account.signedIn && account.credits > 0) return true;
  }
  return false;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readPendingUnlockTarget(): UnlockTarget | null {
  try {
    const value = window.sessionStorage.getItem(PENDING_UNLOCK_KEY);
    return value === "resume" || value === "coverLetter" ? value : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resume / cover letter panel
// ---------------------------------------------------------------------------

function ResumePanel({
  title,
  text,
  downloadName,
  pdfKind,
  headerSource,
  locked = false,
  lockMode = "coverLetter",
  allowCopy = true,
  allowDownloads = true,
  upgradeLabel,
  onRequestUnlock,
  variationLabel,
  variationOptions = []
}: {
  title: string;
  text: string;
  downloadName: string;
  pdfKind: "resume" | "coverLetter";
  headerSource?: string;
  locked?: boolean;
  lockMode?: "resume" | "coverLetter";
  allowCopy?: boolean;
  allowDownloads?: boolean;
  upgradeLabel?: string;
  onRequestUnlock?: () => void;
  variationLabel?: string;
  variationOptions?: string[];
}) {
  const [editedText, setEditedText] = useState(text);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  async function copy() {
    if (!allowCopy) {
      onRequestUnlock?.();
      return;
    }
    try {
      await navigator.clipboard.writeText(sanitizeGeneratedText(editedText));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* swallow â€” older browsers / file:// */
    }
  }

  function downloadTxt() {
    if (!allowDownloads) {
      onRequestUnlock?.();
      return;
    }
    const blob = new Blob([sanitizeGeneratedText(editedText)], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, `${downloadName}.txt`);
  }

  async function downloadPdf() {
    if (!allowDownloads) {
      onRequestUnlock?.();
      return;
    }
    setPdfBusy(true);
    try {
      const blob =
        pdfKind === "coverLetter"
          ? await renderCoverLetterPdf(sanitizeGeneratedText(editedText), headerSource)
          : await renderResumePdf(sanitizeGeneratedText(editedText));
      triggerDownload(blob, `${downloadName}.pdf`);
    } catch (err) {
      console.error("[StepResults] PDF render failed", err);
      alert("Could not render PDF. The plain-text download should still work.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="app-document-panel space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        </div>
        {(allowCopy || allowDownloads) && (
          <div className="flex gap-2 text-xs">
            {allowCopy && (
              <button
                type="button"
                onClick={copy}
                className="rounded-full border border-[var(--color-border-light)] bg-white px-3 py-1.5 font-semibold text-[var(--color-accent-purple)] shadow-sm transition hover:brightness-105"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            {allowDownloads && (
              <>
                <button
                  type="button"
                  onClick={downloadTxt}
                  className="rounded-full border border-[var(--color-border-light)] bg-white px-3 py-1.5 font-semibold text-[var(--color-accent-purple)] shadow-sm transition hover:brightness-105"
                >
                  .txt
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={pdfBusy}
                  className="rounded-full bg-[var(--color-accent-orange)] px-3 py-1.5 font-semibold text-white shadow-[var(--shadow-button)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfBusy ? "Rendering\u2026" : "PDF"}
                </button>
              </>
            )}
          </div>
        )}
        {!locked && !allowDownloads && upgradeLabel && onRequestUnlock && (
          <button
            type="button"
            onClick={onRequestUnlock}
            className="app-button-primary px-5 py-2.5 text-sm"
          >
            {upgradeLabel}
          </button>
        )}
      </div>
      {locked ? (
        <LockedDocumentPreview
          text={editedText}
          title={title}
          mode={lockMode}
          onRequestUnlock={onRequestUnlock}
        />
      ) : (
        <StyledDocumentPreview
          text={editedText}
          kind={pdfKind}
          headerSource={headerSource}
          locked={false}
        />
      )}
      {upgradeLabel && locked && (
        <div className="rounded-[20px] border border-[var(--color-border-light)] bg-white/88 p-4 shadow-[var(--shadow-inset-soft)]">
          <button
            type="button"
            onClick={onRequestUnlock}
            className="app-button-primary w-full justify-center px-5 py-3 text-sm"
          >
            {upgradeLabel}
          </button>
        </div>
      )}
      {!locked && variationLabel && variationOptions.length > 0 && (
        <VariationShell
          label={variationLabel}
          options={variationOptions}
          open={variationOpen}
          onToggle={() => setVariationOpen((current) => !current)}
        />
      )}
    </div>
  );
}

function VariationShell({
  label,
  options,
  open,
  onToggle
}: {
  label: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border-light)] bg-white/72 p-4 shadow-[var(--shadow-inset-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--color-text-primary)]">
            Variation preview
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
            Preview variations are free during beta. Credit rules will apply
            after account storage is enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="app-button-ghost px-5 py-2.5 text-sm"
        >
          {label}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                disabled
                className="rounded-full border border-[var(--color-border-light)] bg-[#f9f4ee] px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)]"
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">
            Variation generation is coming soon. Your current output will stay
            visible until a new variation successfully generates.
          </p>
        </div>
      )}
    </div>
  );
}

function LockedDocumentPreview({
  text,
  title,
  mode,
  onRequestUnlock
}: {
  text: string;
  title: string;
  mode: "resume" | "coverLetter";
  onRequestUnlock?: () => void;
}) {
  const clean = sanitizeGeneratedText(text);

  return (
    <div
      className="relative h-[430px] overflow-hidden rounded-[var(--radius-input)] border border-[var(--color-border-light)] bg-[#f5f7fa] p-3 shadow-[var(--shadow-inset-soft)] sm:p-5"
      aria-label={`${title} locked preview`}
      onCopy={(event) => {
        event.preventDefault();
        onRequestUnlock?.();
      }}
      onMouseDown={(event) => {
        if (event.detail > 1) event.preventDefault();
      }}
    >
      <StyledDocumentPreview
        text={clean}
        kind={mode === "resume" ? "resume" : "coverLetter"}
        locked
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#f5f7fa] via-[#f5f7fa]/92 to-[#f5f7fa]/10" />
    </div>
  );
}

function StyledDocumentPreview({
  text,
  kind,
  headerSource,
  locked
}: {
  text: string;
  kind: "resume" | "coverLetter";
  headerSource?: string;
  locked: boolean;
}) {
  return (
    <div className={locked ? "pointer-events-none select-none" : ""}>
      {kind === "resume" ? (
        <ResumeDocumentPreview text={text} />
      ) : (
        <CoverLetterDocumentPreview text={text} headerSource={headerSource} />
      )}
    </div>
  );
}

function ResumeDocumentPreview({ text }: { text: string }) {
  const model = parseResumeForPdf(limitSkillsSection(sanitizeGeneratedText(text)));
  return (
    <article className="mx-auto min-h-[560px] max-w-[760px] bg-white px-6 py-7 text-[13px] leading-[1.48] text-[#1f2937] shadow-[0_18px_48px_rgba(17,35,63,0.12)] sm:px-9 sm:py-10">
      <header className="border-b border-[#2f3a4a]/35 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h4 className="text-2xl font-black leading-tight tracking-tight text-[#111827]">
            {model.header.name}
          </h4>
          {model.header.title && (
            <p className="max-w-[260px] text-left text-sm font-bold leading-snug text-[#334155] sm:text-right">
              {model.header.title}
            </p>
          )}
        </div>
        {model.header.contact && (
          <p className="mt-3 text-center text-[11px] leading-5 text-[#475569]">
            {model.header.contact}
          </p>
        )}
      </header>

      <div className="mt-5 space-y-5">
        {model.sections.map((section) => (
          <ResumePreviewSection key={`${section.normalized}-${section.heading}`} section={section} />
        ))}
      </div>
    </article>
  );
}

function ResumePreviewSection({ section }: { section: ResumePdfSection }) {
  if (section.lines.length === 0) return null;
  const skills =
    section.normalized === "KEY SKILLS" ? extractSkillsFromLines(section.lines).slice(0, 9) : [];
  return (
    <section>
      <h5 className="border-b border-[#2f3a4a]/25 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#111827]">
        {section.heading}
      </h5>
      {section.normalized === "KEY SKILLS" ? (
        <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {skills.map((skill) => (
            <li key={skill} className="flex gap-2 text-[12px] leading-5 text-[#334155]">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#334155]" />
              <span>{skill}</span>
            </li>
          ))}
        </ul>
      ) : section.normalized === "PROFESSIONAL EXPERIENCE" ? (
        <ExperiencePreviewLines lines={section.lines} />
      ) : (
        <PlainPreviewLines lines={section.lines} />
      )}
    </section>
  );
}

function ExperiencePreviewLines({ lines }: { lines: string[] }) {
  const items: JSX.Element[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBulletLine(line)) {
      items.push(<PreviewBullet key={`${i}-${line}`} text={cleanBullet(line)} />);
      continue;
    }
    const next = lines[i + 1];
    const isTitleLine =
      Boolean(next) &&
      !isBulletLine(next) &&
      (looksLikeExperienceMeta(next) || looksLikeDateLine(next)) &&
      !looksLikeExperienceMeta(line);
    if (isTitleLine) {
      items.push(
        <div key={`${i}-${line}`} className="mt-3 first:mt-0">
          <p className="text-[13px] font-black uppercase tracking-[0.03em] text-[#111827]">
            {line}
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold text-[#64748b]">{next}</p>
        </div>
      );
      i += 1;
      continue;
    }
    if (looksLikeCombinedRoleLine(line)) {
      const parsed = splitCombinedRoleLine(line);
      items.push(
        <div key={`${i}-${line}`} className="mt-3 first:mt-0">
          <p className="text-[13px] font-black uppercase tracking-[0.03em] text-[#111827]">
            {parsed.title}
          </p>
          {parsed.meta && (
            <p className="mt-0.5 text-[11.5px] font-semibold text-[#64748b]">{parsed.meta}</p>
          )}
        </div>
      );
      continue;
    }
    items.push(
      <p key={`${i}-${line}`} className="mt-2 text-[12.5px] leading-5 text-[#334155]">
        {line}
      </p>
    );
  }
  return <div className="mt-3 space-y-1.5">{items}</div>;
}

function PlainPreviewLines({ lines }: { lines: string[] }) {
  return (
    <div className="mt-3 space-y-1.5">
      {lines.map((line, index) =>
        isBulletLine(line) ? (
          <PreviewBullet key={`${index}-${line}`} text={cleanBullet(line)} />
        ) : (
          <p key={`${index}-${line}`} className="text-[12.5px] leading-5 text-[#334155]">
            {line}
          </p>
        )
      )}
    </div>
  );
}

function PreviewBullet({ text }: { text: string }) {
  return (
    <p className="flex gap-2 text-[12.5px] leading-5 text-[#334155]">
      <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[#334155]" />
      <span>{text}</span>
    </p>
  );
}

function CoverLetterDocumentPreview({
  text,
  headerSource
}: {
  text: string;
  headerSource?: string;
}) {
  const header = extractCandidateHeader(headerSource ?? text);
  const body = ensureGreeting(normalizeCoverLetterParagraphs(sanitizeGeneratedText(text)));
  return (
    <article className="mx-auto min-h-[560px] max-w-[760px] bg-white px-6 py-8 text-[13px] leading-[1.65] text-[#1f2937] shadow-[0_18px_48px_rgba(17,35,63,0.12)] sm:px-10 sm:py-11">
      {(header.name || header.contact) && (
        <header className="mb-8 border-b border-[#2f3a4a]/20 pb-4">
          {header.name && (
            <h4 className="text-2xl font-black leading-tight tracking-tight text-[#111827]">
              {header.name}
            </h4>
          )}
          {header.contact && (
            <p className="mt-2 text-[11.5px] leading-5 text-[#475569]">{header.contact}</p>
          )}
        </header>
      )}
      <p className="mb-6 text-[12px] text-[#64748b]">{formatToday()}</p>
      <div className="space-y-4">
        {body.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            className={/^dear\b/i.test(paragraph) ? "font-bold text-[#111827]" : ""}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}

function InterviewPrepCard() {
  return (
    <div className="app-card-soft flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="app-kicker">Interview prep</p>
        <h3 className="mt-2 text-xl app-heading">
          Want the 7 most likely interview questions for this role?
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          Future credits will unlock recruiter-style interview prep based on the
          same job analysis and resume positioning.
        </p>
      </div>
      <Link href="/pricing" className="app-button-secondary shrink-0">
        Generate 7 interview questions, coming soon
      </Link>
    </div>
  );
}

function UnlockModal({
  target,
  mode,
  busy,
  error,
  onCancel,
  onConfirm
}: {
  target: UnlockTarget;
  mode: UnlockMode;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isResume = target === "resume";
  const hasCredits = mode === "consume";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,23,53,0.34)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-[#fffaf4] p-6 shadow-[0_30px_80px_rgba(32,23,53,0.24)]">
        <p className="app-kicker">Credit unlock</p>
        <h2 className="mt-3 text-2xl app-heading">
          {isResume
            ? "Unlock resume export for 1 credit?"
            : "Unlock full cover letter for 1 credit?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {hasCredits
            ? isResume
              ? "This will use 1 credit from your account and unlock copy, TXT, and PDF export for this resume."
              : "This will use 1 credit from your account, reveal the full cover letter, and enable copy/export."
            : isResume
              ? "You’ll go to credits checkout first. After payment, return here to unlock copy, TXT, and PDF export for this resume."
              : "You’ll go to credits checkout first. After payment, return here to reveal the full cover letter and enable copy/export."}
        </p>
        <p className="mt-3 rounded-[18px] bg-white px-4 py-3 text-xs leading-5 text-[var(--color-text-muted)] shadow-[var(--shadow-inset-soft)]">
          {hasCredits
            ? "If you cancel, no credit is used and nothing unlocks."
            : "Credits are added after successful Stripe Checkout. If checkout is cancelled, nothing unlocks."}
        </p>
        {error && (
          <p className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-5 text-rose-900">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="app-button-ghost px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="app-button-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Working..."
              : hasCredits
                ? isResume
                  ? "Unlock resume"
                  : "Unlock cover letter"
                : "Continue to credits"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InterviewPrepUpsellModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,23,53,0.28)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-[#fffaf4] p-6 shadow-[0_30px_80px_rgba(32,23,53,0.24)]">
        <p className="app-kicker">Your resume is ready.</p>
        <h2 className="mt-3 text-2xl app-heading">
          Want to prepare for interviews?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Practice recruiter-style questions based on your resume and this
          specific job posting.
        </p>
        <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
          Interview prep engine coming soon.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="app-button-ghost px-5 py-2.5">
            Not now
          </button>
          <button type="button" onClick={onClose} className="app-button-secondary px-5 py-2.5">
            Generate 7 tailored interview questions for this role
          </button>
        </div>
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF rendering with jsPDF (loaded lazily so it doesn't ship in the
// initial bundle).
// ---------------------------------------------------------------------------

async function renderResumePdf(text: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const model = parseResumeForPdf(limitSkillsSection(text));
  let y = MARGIN;

  y = drawResumeHeader(doc, model.header, y);

  for (const section of model.sections) {
    y = drawSectionHeading(doc, section.heading, y);
    if (section.normalized === "KEY SKILLS") {
      y = drawSkillsList(doc, extractSkillsFromLines(section.lines), y);
      continue;
    }
    if (section.normalized === "PROFESSIONAL EXPERIENCE") {
      y = drawExperienceSection(doc, section.lines, y);
      continue;
    }
    y = drawPlainSection(doc, section.lines, y);
  }

  return doc.output("blob");
}

type ResumePdfHeader = {
  name: string;
  title?: string;
  contact?: string;
};

type ResumePdfSection = {
  heading: string;
  normalized: string;
  lines: string[];
};

type ResumePdfModel = {
  header: ResumePdfHeader;
  sections: ResumePdfSection[];
};

function parseResumeForPdf(text: string): ResumePdfModel {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstSectionIndex = lines.findIndex((line) => normalizeSectionHeading(line));
  const headerLines = firstSectionIndex === -1 ? lines.slice(0, 3) : lines.slice(0, firstSectionIndex);
  const bodyLines = firstSectionIndex === -1 ? lines.slice(3) : lines.slice(firstSectionIndex);
  const name = headerLines[0] || "Candidate";
  const contactIndex = headerLines.findIndex((line, index) => index > 0 && isResumeContactLine(line));
  const title = headerLines
    .slice(1, contactIndex === -1 ? undefined : contactIndex)
    .find((line) => !isResumeContactLine(line));
  const contact = contactIndex >= 0 ? headerLines[contactIndex] : headerLines.find(isResumeContactLine);
  const sections: ResumePdfSection[] = [];
  let current: ResumePdfSection | null = null;

  for (const line of bodyLines) {
    const normalized = normalizeSectionHeading(line);
    if (normalized) {
      current = {
        heading: normalized,
        normalized,
        lines: []
      };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "PROFESSIONAL SUMMARY", normalized: "PROFESSIONAL SUMMARY", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }

  return { header: { name, title, contact }, sections };
}

function normalizeSectionHeading(line: string): string | null {
  const normalized = line.toLowerCase().replace(/[:.\s]+$/, "");
  if (/^(summary|professional summary|profile)$/.test(normalized)) return "PROFESSIONAL SUMMARY";
  if (/^(key skills|skills|core skills|core skills \/ capabilities|core competencies|technical skills)$/.test(normalized)) return "KEY SKILLS";
  if (/^(experience|work experience|professional experience|employment history|work history)$/.test(normalized)) return "PROFESSIONAL EXPERIENCE";
  if (/^(education|academic background)$/.test(normalized)) return "EDUCATION";
  if (/^(tools|tool stack|technical toolkit)$/.test(normalized)) return "TOOL STACK";
  if (/^(certifications|licenses|credentials)$/.test(normalized)) return "CERTIFICATIONS";
  return null;
}

function drawResumeHeader(
  doc: import("jspdf").jsPDF,
  header: ResumePdfHeader,
  y: number
): number {
  y = ensureRoom(doc, y, 64);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_NAME);
  doc.text(header.name, MARGIN, y + FS_NAME);

  if (header.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS_TITLE);
    const wrappedTitle = doc.splitTextToSize(header.title, CONTENT_WIDTH * 0.42) as string[];
    wrappedTitle.slice(0, 2).forEach((line, index) => {
      doc.text(line, MARGIN + CONTENT_WIDTH, y + FS_TITLE + 2 + index * 13, {
        align: "right"
      });
    });
  }

  const titleLineCount = header.title
    ? (doc.splitTextToSize(header.title, CONTENT_WIDTH * 0.42) as string[]).length
    : 0;
  y += titleLineCount > 1 ? 42 : 30;
  doc.setLineWidth(0.65);
  doc.setDrawColor(60, 60, 60);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  y += 11;

  if (header.contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_META);
    const contactLines = doc.splitTextToSize(header.contact, CONTENT_WIDTH) as string[];
    for (const line of contactLines.slice(0, 2)) {
      y = ensureRoom(doc, y, 11);
      doc.text(line, MARGIN + CONTENT_WIDTH / 2, y + FS_META, { align: "center" });
      y += 11;
    }
  }

  return y + 18;
}

function drawSectionHeading(
  doc: import("jspdf").jsPDF,
  heading: string,
  y: number
): number {
  y += 7;
  y = ensureRoom(doc, y, 24);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_SECTION);
  doc.text(heading.toUpperCase(), MARGIN, y + FS_SECTION);
  y += FS_SECTION + 4;
  doc.setLineWidth(0.45);
  doc.setDrawColor(80, 80, 80);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  return y + 9;
}

function drawSkillsList(
  doc: import("jspdf").jsPDF,
  skills: string[],
  y: number
): number {
  const limited = skills.slice(0, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_BODY);
  for (const skill of limited) {
    y = drawBullet(doc, skill, y);
  }
  return y + 4;
}

function drawExperienceSection(
  doc: import("jspdf").jsPDF,
  lines: string[],
  y: number
): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (isBulletLine(line)) {
      y = drawBullet(doc, cleanBullet(line), y);
      continue;
    }

    const next = lines[i + 1];
    const previous = lines[i - 1];
    const isTitleLine =
      !isBulletLine(line) &&
      Boolean(next) &&
      !isBulletLine(next) &&
      (looksLikeExperienceMeta(next) || looksLikeDateLine(next)) &&
      !looksLikeExperienceMeta(line);

    if (isTitleLine) {
      y += previous ? 7 : 0;
      y = ensureRoom(doc, y, 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.8);
      doc.text(line.toUpperCase(), MARGIN, y + 10.8);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_META);
      doc.text(next, MARGIN, y + FS_META);
      y += 16;
      i += 1;
      continue;
    }

    if (looksLikeCombinedRoleLine(line)) {
      const parsed = splitCombinedRoleLine(line);
      y += previous ? 7 : 0;
      y = ensureRoom(doc, y, 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.8);
      doc.text(parsed.title.toUpperCase(), MARGIN, y + 10.8);
      y += 14;
      if (parsed.meta) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_META);
        doc.text(parsed.meta, MARGIN, y + FS_META);
        y += 16;
      }
      continue;
    }

    y = drawParagraph(doc, line, y, CONTENT_WIDTH, "normal");
    y += 2;
  }
  return y + 2;
}

function drawPlainSection(
  doc: import("jspdf").jsPDF,
  lines: string[],
  y: number
): number {
  for (const line of lines) {
    if (isBulletLine(line)) {
      y = drawBullet(doc, cleanBullet(line), y);
    } else {
      y = drawParagraph(doc, line, y, CONTENT_WIDTH, "normal");
      y += 2;
    }
  }
  return y + 2;
}

function drawParagraph(
  doc: import("jspdf").jsPDF,
  text: string,
  y: number,
  width: number,
  style: "normal" | "bold"
): number {
  doc.setFont("helvetica", style);
  doc.setFontSize(FS_BODY);
  const wrapped = doc.splitTextToSize(text, width) as string[];
  for (const line of wrapped) {
    y = ensureRoom(doc, y, LH_BODY);
    doc.text(line, MARGIN, y + FS_BODY);
    y += LH_BODY;
  }
  return y;
}

function drawBullet(
  doc: import("jspdf").jsPDF,
  text: string,
  y: number
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_BODY);
  const wrapped = doc.splitTextToSize(text, CONTENT_WIDTH - 17) as string[];
  for (let j = 0; j < wrapped.length; j++) {
    y = ensureRoom(doc, y, LH_BODY);
    if (j === 0) doc.text("\u2022", MARGIN + 2, y + FS_BODY);
    doc.text(wrapped[j], MARGIN + 17, y + FS_BODY);
    y += LH_BODY + LH_BULLET_GAP;
  }
  return y + 1;
}

function extractSkillsFromLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines
    .join("\n")
    .split(/[,;\nâ€¢•]+/)
    .map((skill) => skill.replace(/^\s*[-*]\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((skill) => skill.length <= 80)
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isResumeContactLine(line: string): boolean {
  return /@|\b(?:https?:\/\/|www\.|linkedin\.com|[a-z0-9-]+\.(?:com|ca|net|org|io))\b|\d{3}[-.)\s]\d{3}/i.test(line);
}

function isBulletLine(line: string): boolean {
  return /^\s*[â€¢•\-*·●◦▪]\s+/.test(line);
}

function cleanBullet(line: string): string {
  return line.replace(/^\s*[â€¢•\-*·●◦▪]\s+/, "").trim();
}

function looksLikeExperienceMeta(line?: string): boolean {
  if (!line) return false;
  return /\s\|\s/.test(line) || looksLikeDateLine(line);
}

function looksLikeDateLine(line?: string): boolean {
  if (!line) return false;
  return /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s+-\s+(?:Present|Current|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\b|\b(?:19|20)\d{2}\s+-\s+(?:Present|Current|(?:19|20)\d{2})\b/i.test(line);
}

function looksLikeCombinedRoleLine(line: string): boolean {
  return /\s+\|\s+/.test(line) && looksLikeDateLine(line);
}

function splitCombinedRoleLine(line: string): { title: string; meta?: string } {
  const parts = line.split(/\s+\|\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { title: line };
  return {
    title: parts[0],
    meta: parts.slice(1).join(" | ")
  };
}


async function renderCoverLetterPdf(
  text: string,
  headerSource?: string
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const header = extractCandidateHeader(headerSource ?? text);
  const paragraphs = normalizeCoverLetterParagraphs(text);
  const body = ensureGreeting(paragraphs);
  let y = MARGIN;

  if (header.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS_NAME);
    y = ensureRoom(doc, y, FS_NAME + 4);
    doc.text(header.name, MARGIN, y + FS_NAME);
    y += FS_NAME + 6;
  }

  if (header.contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const contactLines = doc.splitTextToSize(
      header.contact,
      CONTENT_WIDTH
    ) as string[];
    for (const line of contactLines) {
      y = ensureRoom(doc, y, 12);
      doc.text(line, MARGIN, y + 9.5);
      y += 12;
    }
  }

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_LETTER_BODY);
  y = drawLetterParagraph(doc, formatToday(), y);
  y += 10;

  for (const paragraph of body) {
    y = drawLetterParagraph(doc, paragraph, y);
    y += 10;
  }

  return doc.output("blob");
}

function drawLetterParagraph(
  doc: import("jspdf").jsPDF,
  paragraph: string,
  y: number
): number {
  doc.setFont("helvetica", paragraph === "Dear Hiring Manager," ? "bold" : "normal");
  doc.setFontSize(FS_LETTER_BODY);
  const wrapped = doc.splitTextToSize(paragraph, CONTENT_WIDTH) as string[];
  for (const line of wrapped) {
    y = ensureRoom(doc, y, LH_LETTER);
    doc.text(line, MARGIN, y + FS_LETTER_BODY);
    y += LH_LETTER;
  }
  doc.setFont("helvetica", "normal");
  return y;
}

function extractCandidateHeader(text: string): { name?: string; contact?: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const name = lines[0] && !isCoverLetterLabel(lines[0]) ? lines[0] : undefined;
  const contact = lines
    .slice(1, 4)
    .find((line) => /@|\b(?:https?:\/\/|linkedin\.com)|\d{3}[-.)\s]\d{3}/i.test(line));
  return { name, contact };
}

function normalizeCoverLetterParagraphs(text: string): string[] {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((paragraph) => paragraph && !isCoverLetterLabel(paragraph))
    .filter((paragraph) => !isDateLine(paragraph));
}

function ensureGreeting(paragraphs: string[]): string[] {
  if (paragraphs.some((paragraph) => /^dear\b/i.test(paragraph))) {
    return paragraphs;
  }
  return ["Dear Hiring Manager,", ...paragraphs];
}

function isCoverLetterLabel(text: string): boolean {
  return /^(?:tailored\s+)?cover\s+letter:?$/i.test(text.trim());
}

function isDateLine(text: string): boolean {
  return /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$/i.test(
    text.trim()
  );
}

function formatToday(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

function ensureRoom(
  doc: import("jspdf").jsPDF,
  y: number,
  needed: number
): number {
  if (y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}





