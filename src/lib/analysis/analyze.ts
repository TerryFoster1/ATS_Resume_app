// Top-level analysis orchestrator.
//
// Pipeline (handoff Â§11):
//   1. extractAndMatch   â€” single LLM call producing requirements +
//                          evidence + matches.
//   2. enforceDecisions  â€” Decision Enforcement Layer. Deterministic
//                          rewrites of LLM classifications based on
//                          experience-year math, cluster transfers, and
//                          tool-category fall-through.
//   3. calculateScore    â€” weighted score + buckets.
//   4. generateClarifications â€” FollowUp[] for the UI.
//   5. (optional)        â€” buildResumeStrategy is invoked separately by
//                          the rewrite path; analyze.ts does NOT need it.
//
// Returns AnalysisResult ready for /api/analyze to send back, or for
// /api/rescore to call again on the tailored resume.

import type { AnalysisResult } from "../types";
import { extractAndMatch } from "./extractAndMatch";
import { enforceDecisions } from "./enforceDecisions";
import { calculateScore } from "./calculateScore";
import { generateClarifications } from "./generateClarifications";
import { assessFit } from "./fitAssessment";
import { fallbackAnalyzeWithoutLlm } from "./deterministicFallback";
import {
  buildRequirementConfidence,
  semanticScoreFloorFromConfidence
} from "./requirementConfidence";
import { runResumeStructureChecks } from "../atsChecker";
import { normalizeText } from "../utils/normalizeText";
import { elapsedMs, estimateTokens, logDevTiming, nowMs } from "../utils/perf";
import { inferWritingLocaleFromJob } from "../writingLocale";

export interface AnalyzeArgs {
  resumeText: string;
  jobPostText: string;
  // Optional override on the LLM call timeout (default 90s).
  timeoutMs?: number;
}

const ANALYZE_CACHE_LIMIT = 20;
const analyzeCache = new Map<string, AnalysisResult>();

export async function analyze(args: AnalyzeArgs): Promise<AnalysisResult> {
  const totalStarted = nowMs();
  const preprocessStarted = nowMs();
  const safeResume = normalizeText(args.resumeText);
  const safeJob = normalizeText(args.jobPostText);
  const writingLocale = inferWritingLocaleFromJob(safeJob);
  logDevTiming("analyze.preprocess", {
    ms: elapsedMs(preprocessStarted),
    resumeChars: safeResume.length,
    jobChars: safeJob.length,
    resumeTokensEst: estimateTokens(safeResume),
    jobTokensEst: estimateTokens(safeJob)
  });

  if (!safeResume || !safeJob) {
    return emptyResult(
      !safeResume
        ? "No resume text provided."
        : "No job posting text provided."
    );
  }

  const cacheKey = analysisCacheKey(safeResume, safeJob);
  const cached = analyzeCache.get(cacheKey);
  if (cached) {
    logDevTiming("analyze.cache", {
      hit: true,
      totalMs: elapsedMs(totalStarted),
      reqs: cached.requirements.length,
      score: cached.score
    });
    return cloneAnalysis(cached);
  }

  let extracted;
  let fallbackReason: string | undefined;
  try {
    const extractStarted = nowMs();
    extracted = await extractAndMatch({
      resumeText: safeResume,
      jobPostText: safeJob,
      timeoutMs: args.timeoutMs
    });
    logDevTiming("analyze.extractAndMatch", {
      ms: elapsedMs(extractStarted),
      reqs: extracted.requirements.length,
      evidence: extracted.evidence.length,
      matches: extracted.matches.length
    });
  } catch (err) {
    console.error(
      "[analyze] extractAndMatch failed",
      err instanceof Error ? err.message : err
    );
    const fallbackStarted = nowMs();
    const fallback = fallbackAnalyzeWithoutLlm({
      resumeText: safeResume,
      jobPostText: safeJob
    });
    logDevTiming("analyze.fallback", {
      ms: elapsedMs(fallbackStarted),
      reqs: fallback.requirements.length,
      score: fallback.score
    });
    if (fallback.requirements.length === 0) {
      return emptyResult(
        "Analysis failed during the structured extraction step. Please try again."
      );
    }
    extracted = {
      requirements: fallback.requirements,
      evidence: fallback.evidence,
      matches: fallback.matches
    };
    fallbackReason =
      "Claude structured extraction failed, so the app used a faster local requirement scan.";
  }

  const postStarted = nowMs();
  const { matches: enforcedMatches, interventions } = enforceDecisions({
    requirements: extracted.requirements,
    evidence: extracted.evidence,
    matches: extracted.matches
  });

  if (interventions.length > 0) {
    console.info(
      `[analyze] ${interventions.length} decision interventions:`,
      interventions
        .map((i) => `${i.requirementId} (${i.reason})`)
        .join("; ")
    );
  }

  let { score, scoreSummary, buckets } = calculateScore(
    enforcedMatches,
    extracted.requirements
  );
  const requirementConfidence = buildRequirementConfidence({
    requirements: extracted.requirements,
    evidence: extracted.evidence,
    matches: enforcedMatches
  });
  const semanticFloor = semanticScoreFloorFromConfidence({
    requirementConfidence,
    evidenceCount: extracted.evidence.length
  });
  if (score < semanticFloor) {
    score = semanticFloor;
    scoreSummary = assessFit({
      score,
      requirements: extracted.requirements,
      matches: enforcedMatches
    }).scoreSummary;
  }
  const atsStructureHealthScore = computeStructureHealthScore(safeResume);

  logCoverageDebug({
    requirements: extracted.requirements,
    evidence: extracted.evidence,
    matches: enforcedMatches,
    score,
    requirementConfidence
  });

  const followUps = generateClarifications({
    matches: enforcedMatches,
    requirements: extracted.requirements
  });

  const result: AnalysisResult = {
    requirements: extracted.requirements,
    evidence: extracted.evidence,
    matches: enforcedMatches,
    buckets,
    followUps,
    score,
    semanticFitScore: score,
    atsStructureHealthScore,
    requirementConfidence,
    writingLocale,
    scoreSummary,
    fallbackReason
  };
  logDevTiming("analyze.postprocess", {
    ms: elapsedMs(postStarted),
    followUps: followUps.length,
    score
  });
  logDevTiming("analyze.total", {
    ms: elapsedMs(totalStarted),
    claudeCalls: 1,
    score,
    reqs: result.requirements.length
  });
  rememberAnalysis(cacheKey, result);
  return cloneAnalysis(result);
}

function emptyResult(reason: string): AnalysisResult {
  return {
    requirements: [],
    evidence: [],
    matches: [],
    buckets: {
      strengths: [],
      partials: [],
      clarifications: [],
      missing: []
    },
    followUps: [],
    score: 0,
    semanticFitScore: 0,
    atsStructureHealthScore: 0,
    requirementConfidence: [],
    writingLocale: "canadian_uk_english",
    scoreSummary: "Could not score this match.",
    fallbackReason: reason
  };
}

function analysisCacheKey(resumeText: string, jobPostText: string): string {
  return `${hashText(resumeText)}:${hashText(jobPostText)}`;
}

function rememberAnalysis(key: string, value: AnalysisResult): void {
  analyzeCache.set(key, cloneAnalysis(value));
  while (analyzeCache.size > ANALYZE_CACHE_LIMIT) {
    const oldest = analyzeCache.keys().next().value;
    if (!oldest) break;
    analyzeCache.delete(oldest);
  }
}

function cloneAnalysis(value: AnalysisResult): AnalysisResult {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function computeStructureHealthScore(resumeText: string): number {
  const checks = runResumeStructureChecks(resumeText);
  if (checks.length === 0) return 0;
  const passed = checks.filter((check) => check.passed).length;
  return Math.round((passed / checks.length) * 100);
}

function logCoverageDebug(
  args: Pick<AnalysisResult, "requirements" | "evidence" | "matches" | "score" | "requirementConfidence">
): void {
  if (process.env.NODE_ENV === "production") return;
  const evidenceById = new Map(args.evidence.map((e) => [e.id, e]));
  const highImpact = args.matches.filter((match) => match.requirementImportance === "HIGH");
  const fit = assessFit({
    score: args.score,
    requirements: args.requirements,
    matches: args.matches
  });
  console.info(
    `[analysis-debug] fit=${fit.band} score=${args.score} highImpact=${highImpact.length} hardMissing=${JSON.stringify(
      fit.missingHardRequirements
    )} mustHaveMissing=${JSON.stringify(fit.missingMustHaveRequirements.slice(0, 5))}`
  );
  console.info(
    "[analysis-confidence-debug]",
    args.requirementConfidence
      ?.filter((item) => item.importance === "HIGH" || item.questionNeeded)
      .map((item) => ({
        requirementId: item.requirementId,
        requirementText: item.requirementText,
        category: item.category,
        confidence: item.evidenceConfidence,
        band: item.evidenceBand,
        questionNeeded: item.questionNeeded,
        priority: item.questionPriority,
        reason: item.reason
      }))
  );
  for (const match of highImpact) {
    const evidence = match.evidenceIds
      .map((id) => evidenceById.get(id)?.text)
      .filter((text): text is string => Boolean(text))
      .slice(0, 3);
    console.info(
      `[analysis-debug] req=${match.requirementId} status=${match.classification} lens=${match.lens} contribution=${match.requirementImportance} text="${match.requirementText}" evidence=${JSON.stringify(evidence)} question=${JSON.stringify(match.clarificationQuestion ?? null)}`
    );
  }
}
