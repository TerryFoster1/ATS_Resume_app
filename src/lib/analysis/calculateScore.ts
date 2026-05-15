// Score + bucketing pass.
//
// Wraps computeMatchScore from matchScore.ts and partitions the matches
// into the four UI buckets the AnalysisResult shape carries. Also produces
// a one-line plain-English summary keyed off the score.

import type { AnalysisResult, MatchEvaluation } from "../types";
import type { JobRequirement } from "../types";
import { computeSemanticFitScore } from "../matchScore";
import { bucketByClassification, rankMatches } from "../utils/evidence";
import { scoreSummaryForAnalysis } from "./fitAssessment";

export function calculateScore(matches: MatchEvaluation[], requirements: JobRequirement[] = []): {
  score: number;
  scoreSummary: string;
  buckets: AnalysisResult["buckets"];
} {
  const score = computeSemanticFitScore(matches, requirements);
  const scoreSummary = scoreSummaryForAnalysis(score, requirements, matches);
  const raw = bucketByClassification(matches);
  const buckets: AnalysisResult["buckets"] = {
    strengths: rankMatches(raw.strengths),
    partials: rankMatches(raw.partials),
    clarifications: rankMatches(raw.clarifications),
    missing: rankMatches(raw.missing)
  };
  return { score, scoreSummary, buckets };
}
