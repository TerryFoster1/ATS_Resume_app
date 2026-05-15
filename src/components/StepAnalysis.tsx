"use client";

import { useMemo, useState } from "react";

import CapabilityQuestionRow from "@/components/CapabilityQuestionRow";
import MatchGauge from "@/components/MatchGauge";
import RequirementRow from "@/components/RequirementRow";
import StepIndicator from "@/components/StepIndicator";
import { CoachGraphic } from "@/components/VisualDecor";
import {
  roleContextForMatch,
  transformAnswerToResumeContent
} from "@/lib/analysis/answerTransform";
import { deriveAnalysisUiState } from "@/lib/analysis/analysisUiState";
import { buildCapabilityQuestionClusters } from "@/lib/analysis/capabilityQuestionClusters";
import { assessFit } from "@/lib/analysis/fitAssessment";
import { getQuestionSuppressionReason } from "@/lib/analysis/jobAdItems";
import { getPreGenerationBlockers } from "@/lib/preGenerationBlockers";
import type { AnalysisResult, JobRequirement, MatchEvaluation, RequirementConfidence } from "@/lib/types";

interface Props {
  analysis: AnalysisResult;
  resumeText: string;
  answers: Record<string, string>;
  onAnswerChange: (requirementId: string, answer: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  answeredQuestionMemory?: string[];
}

export default function StepAnalysis({
  analysis,
  resumeText,
  answers,
  onAnswerChange,
  onBack,
  onGenerate,
  answeredQuestionMemory = []
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCovered, setShowCovered] = useState(false);
  const { matches, buckets, score, fallbackReason } = analysis;
  const semanticScore = analysis.semanticFitScore ?? score;
  const hasData = matches.length > 0;
  const confidenceByRequirement = useMemo(
    () =>
      new Map(
        (analysis.requirementConfidence ?? []).map((item) => [
          item.requirementId,
          item
        ])
      ),
    [analysis.requirementConfidence]
  );
  

  const actionable = useMemo(
    () =>
      [
        ...buckets.missing,
        ...buckets.partials,
        ...buckets.clarifications
      ]
        .filter((match) =>
          shouldAskCandidate(
            match,
            analysis.requirements.find((r) => r.id === match.requirementId),
            semanticScore,
            confidenceByRequirement.get(match.requirementId)
          )
        )
        .sort((a, b) => {
          const bPriority = confidenceByRequirement.get(b.requirementId)?.questionPriority ?? 0;
          const aPriority = confidenceByRequirement.get(a.requirementId)?.questionPriority ?? 0;
          return bPriority - aPriority;
        }),
    [analysis.requirements, buckets.clarifications, buckets.missing, buckets.partials, confidenceByRequirement, semanticScore]
  );

  const questionClusters = useMemo(
    () => buildCapabilityQuestionClusters(analysis, actionable, answeredQuestionMemory),
    [actionable, analysis, answeredQuestionMemory]
  );

  const structuralBlockers = useMemo(
    () => getPreGenerationBlockers(resumeText),
    [resumeText]
  );
  const visibleStructuralBlockers = useMemo(
    () =>
      structuralBlockers.filter(
        (blocker) =>
          blocker.required ||
          (questionClusters.length === 0 && semanticScore >= 65)
      ),
    [questionClusters.length, semanticScore, structuralBlockers]
  );

  const coveredMatches = useMemo(
    () => buckets.strengths.slice(0, 4),
    [buckets.strengths]
  );

  const totalRenderedQuestionCount = questionClusters.length + visibleStructuralBlockers.length;
  const renderedJobFitQuestionCount = questionClusters.length;
  const unansweredStructuralBlockers = visibleStructuralBlockers.filter(
    (blocker) => blocker.required && !answers[blocker.id]?.trim()
  );
  const hasAnyAnsweredContext =
    answeredQuestionMemory.length > 0 ||
    Object.values(answers).some((answer) => answer.trim().length > 0);
  const fit = assessFit({
    score: semanticScore,
    requirements: analysis.requirements,
    matches,
    renderedQuestionCount: renderedJobFitQuestionCount,
    hasAnsweredContext: hasAnyAnsweredContext
  });
  const uiState = deriveAnalysisUiState({
    hasData,
    score: semanticScore,
    fit,
    renderedQuestionCount: renderedJobFitQuestionCount,
    actionableGapCount: actionable.length,
    structuralIssueCount: visibleStructuralBlockers.length,
    unansweredRequiredStructuralCount: unansweredStructuralBlockers.length
  });

  const answeredCount = questionClusters.filter((cluster) =>
    answerForCluster(cluster.relatedRequirementIds, answers).trim()
  ).length + visibleStructuralBlockers.filter((blocker) => answers[blocker.id]?.trim()).length;

  if (process.env.NODE_ENV !== "production") {
    const suppressedQuestionReasons: string[] = [];
    if (actionable.length > 0 && questionClusters.length === 0) {
      suppressedQuestionReasons.push("Actionable gaps were filtered, deduped, or already answered before rendering.");
    }
    if (structuralBlockers.length > visibleStructuralBlockers.length) {
      suppressedQuestionReasons.push("Optional structural prompts were hidden because they are not required at this score.");
    }
    if (score < 80 && totalRenderedQuestionCount === 0 && actionable.length === 0) {
      suppressedQuestionReasons.push("No missing, partial, or clarification match passed the question filter.");
    }

    console.info("[analysis-ui-debug]", {
      fitBand: fit.band,
      score: semanticScore,
      rawScore: score,
      atsStructureHealthScore: analysis.atsStructureHealthScore,
      readyToGenerate: uiState.state === "ready",
      rawQuestionCount: actionable.length + structuralBlockers.length,
      filteredQuestionCount: questionClusters.length + visibleStructuralBlockers.length,
      renderedQuestionCount: totalRenderedQuestionCount,
      renderedJobFitQuestionCount,
      hardRequirementsMissing: fit.missingHardRequirements,
      weakRequirementCount: actionable.length,
      structuralIssueCount: visibleStructuralBlockers.length,
      suppressedQuestionReasons,
      matchCardMessage: uiState.matchCardTitle,
      topMissingMustHaveRequirements: fit.missingMustHaveRequirements.slice(0, 5),
      renderedQuestions: questionClusters
        .map((cluster) => cluster.question)
        .concat(visibleStructuralBlockers.map((blocker) => blocker.question)),
      structuralBlockers: visibleStructuralBlockers,
    });
  }

  return (
    <section className="space-y-6">
      <div className="app-screen-card space-y-7">
        <StepIndicator current={3} total={4} label="Analysis" />

        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <p className="app-kicker">Resume coach</p>
            <h2 className="text-3xl app-heading">
              {uiState.heading}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-primary)]/75">
              {uiState.subtext}
            </p>
          </div>
          <CoachGraphic className="hidden md:block" />
        </div>

        {hasData ? (
          <div className="space-y-6">
            <div className="app-feature-panel grid gap-5 lg:grid-cols-[1fr_minmax(320px,420px)] lg:items-center">
              <div>
                <p className="app-kicker">Current match</p>
                <h3 className="mt-2 text-2xl app-heading">
                  {uiState.matchCardTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-primary)]/72">
                  {uiState.matchCardSubtext}
                </p>
              </div>
              <MatchGauge score={semanticScore} className="mx-auto lg:mx-0" />
            </div>

            {uiState.showQuestionsHeader && (questionClusters.length > 0 || visibleStructuralBlockers.length > 0) && (
              <div className="app-inset-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Questions worth answering
                  </p>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
                    {answeredCount} of {questionClusters.length + visibleStructuralBlockers.length} answered
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                  These are grouped so you only answer once when several job-ad
                  requirements point to the same underlying experience.
                </p>
              </div>
            )}

            {(questionClusters.length > 0 || visibleStructuralBlockers.length > 0) && (
              <div className="space-y-3">
                <ul className="space-y-4">
                  {questionClusters.map((cluster) => {
                    const roleContext = roleContextForMatch(analysis, cluster.primaryMatch);
                    const answer = answerForCluster(cluster.relatedRequirementIds, answers);
                    return (
                      <CapabilityQuestionRow
                        key={cluster.id}
                        cluster={cluster}
                        answer={answer}
                        transformedBullet={transformAnswerToResumeContent({
                          answer,
                          match: cluster.primaryMatch,
                          roleContext
                        })}
                        expanded={expandedId === cluster.id}
                        onToggle={() =>
                          setExpandedId((current) =>
                            current === cluster.id ? null : cluster.id
                          )
                        }
                        onAnswerChange={(answer) =>
                          updateClusterAnswer(cluster.relatedRequirementIds, answer, onAnswerChange)
                        }
                      />
                    );
                  })}
                  {visibleStructuralBlockers.map((blocker) => (
                    <li
                      key={blocker.id}
                      className="app-work-panel border-l-4 border-l-[var(--color-accent-orange)] p-5"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-[var(--color-accent-purple)]">
                            {blocker.label}
                            {!blocker.required && (
                              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                                Optional
                              </span>
                            )}
                          </p>
                          <h3 className="mt-2 text-lg font-black text-[var(--color-text-primary)]">
                            {blocker.question}
                          </h3>
                          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                            ATS note: {blocker.detail}
                          </p>
                        </div>
                        <textarea
                          value={answers[blocker.id] ?? ""}
                          onChange={(event) =>
                            onAnswerChange(blocker.id, event.target.value)
                          }
                          className="app-textarea min-h-[96px]"
                          placeholder={blocker.placeholder ?? "Add the missing detail here."}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coveredMatches.length > 0 && (
              <div className="app-work-panel p-5">
                <button
                  type="button"
                  onClick={() => setShowCovered((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                      Already covered by your resume
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                      These matched strongly enough that we do not need more detail right now.
                    </span>
                  </span>
                  <span className="rounded-full border border-[var(--color-border-light)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-accent-purple)]">
                    {showCovered ? "Hide" : "Show"}
                  </span>
                </button>

                {showCovered && (
                  <div className="mt-4 space-y-3">
                    <ul className="space-y-3">
                      {coveredMatches.map((m) => (
                        <RequirementRow key={m.requirementId} match={m} />
                      ))}
                    </ul>
                    {matches.length > actionable.length + coveredMatches.length && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Remaining covered requirements still influence your tailored resume.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="app-work-panel space-y-2 border border-amber-200 p-5 text-sm text-amber-900">
            <p className="font-medium">
              We couldn&rsquo;t build a structured requirement map for this posting.
            </p>
            {fallbackReason && (
              <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[11px] text-amber-900">
                Reason (check server logs for details): {fallbackReason}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="app-button-secondary"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {hasData && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={!uiState.canGenerate}
                className={`${uiState.useCautiousCta ? "app-button-secondary" : "app-button-primary"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {uiState.primaryCtaLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function shouldAskCandidate(
  match: MatchEvaluation,
  requirement?: JobRequirement,
  score?: number,
  confidence?: RequirementConfidence
): boolean {
  if (match.classification === "MATCH") return false;
  if (confidence?.questionNeeded || (confidence?.questionPriority ?? 0) >= 70) {
    return !requirement || !getQuestionSuppressionReason(requirement);
  }
  if (requirement && getQuestionSuppressionReason(requirement)) return false;
  if (requirement?.intent === "PREFERRED" && !isHardRequirement(requirement)) {
    return false;
  }
  if (match.requirementImportance === "HIGH") return true;
  if (
    typeof score === "number" &&
    score < 80 &&
    match.requirementImportance === "MEDIUM" &&
    (match.classification === "MISSING" ||
      match.classification === "PARTIAL" ||
      match.classification === "CLARIFY")
  ) {
    return true;
  }
  if (match.classification === "CLARIFY" && requirement && isHardRequirement(requirement)) {
    return true;
  }
  return false;
}

function isHardRequirement(requirement: JobRequirement): boolean {
  return requirement.kind === "TOOL" || requirement.kind === "CERTIFICATION";
}

function answerForCluster(
  requirementIds: string[],
  answers: Record<string, string>
): string {
  for (const requirementId of requirementIds) {
    const answer = answers[requirementId];
    if (answer?.trim()) return answer;
  }
  return "";
}

function updateClusterAnswer(
  requirementIds: string[],
  answer: string,
  onAnswerChange: (requirementId: string, answer: string) => void
): void {
  for (const requirementId of requirementIds) {
    onAnswerChange(requirementId, answer);
  }
}










