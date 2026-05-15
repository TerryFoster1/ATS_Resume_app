// Match-score math.
//
// Both /api/analyze (initial score, before tailoring) and /api/rescore
// (after-tailoring score) compute the headline number through the same
// function so the before/after transition is apples-to-apples.
//
// Per handoff scoring rules:
//
//   STATUS_SCORE
//     MATCH    = 1.0   resume proves the requirement
//     PARTIAL  = 0.65  adjacent evidence, directionally right but not fully proven
//     CLARIFY  = 0.5   plausible but needs a specific hard fact confirmed
//     MISSING  = 0     no plausible trace and no transferable bridge
//
//   IMPORTANCE_WEIGHT
//     HIGH    = 1.25
//     MEDIUM  = 1.0
//     LOW     = 0.75

import type {
  JobRequirement,
  Importance,
  MatchClassification,
  MatchEvaluation
} from "./types";

export const STATUS_SCORE: Record<MatchClassification, number> = {
  MATCH: 1.0,
  PARTIAL: 0.65,
  CLARIFY: 0.5,
  MISSING: 0
};

export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  HIGH: 1.25,
  MEDIUM: 1.0,
  LOW: 0.75
};

// Weighted match score as an integer percentage on [0, 100]. Returns 0 when
// there are no evaluable matches so callers can hide the score instead of
// rendering a misleading number.
export function computeMatchScore(matches: MatchEvaluation[]): number {
  if (matches.length === 0) return 0;
  let weightSum = 0;
  let weightedScore = 0;
  for (const m of matches) {
    const w = IMPORTANCE_WEIGHT[m.requirementImportance];
    weightSum += w;
    weightedScore += w * STATUS_SCORE[m.classification];
  }
  if (weightSum === 0) return 0;
  return Math.round((weightedScore / weightSum) * 100);
}

export function computeSemanticFitScore(
  matches: MatchEvaluation[],
  requirements: JobRequirement[] = []
): number {
  const reqById = new Map(requirements.map((req) => [req.id, req]));
  const semanticMatches = matches.filter((match) => {
    const req = reqById.get(match.requirementId);
    return !isStructuralHygieneRequirement(match.requirementText, req);
  });

  const relevantMatches = semanticMatches.length > 0 ? semanticMatches : matches;
  const rawScore = computeMatchScore(relevantMatches);
  if (rawScore === 0) return 0;
  return calibrateRecruiterAlignmentScore(rawScore, relevantMatches, reqById);
}

function calibrateRecruiterAlignmentScore(
  rawScore: number,
  matches: MatchEvaluation[],
  reqById: Map<string, JobRequirement>
): number {
  const evidenceBearing = matches.filter(
    (match) => match.classification === "MATCH" || match.classification === "PARTIAL" || match.classification === "CLARIFY"
  );
  const highOrMediumEvidence = evidenceBearing.filter(
    (match) => match.requirementImportance === "HIGH" || match.requirementImportance === "MEDIUM"
  );
  const transferableEvidence = evidenceBearing.filter(
    (match) => match.lens === "CLUSTER_TRANSFER" || match.classification === "PARTIAL" || match.classification === "CLARIFY"
  );
  const hardGaps = matches.filter((match) => {
    const requirement = reqById.get(match.requirementId);
    return Boolean(requirement && isHardGapRequirement(requirement) && match.classification === "MISSING");
  });

  let calibrated = rawScore;

  if (evidenceBearing.length >= 5 && rawScore < 55) calibrated = 55;
  else if (evidenceBearing.length >= 3 && rawScore < 45) calibrated = 45;
  else if (transferableEvidence.length >= 3 && rawScore < 48) calibrated = 48;
  else if (highOrMediumEvidence.length >= 2 && rawScore < 40) calibrated = 40;

  if (hardGaps.length >= 3) calibrated -= 10;
  else if (hardGaps.length === 2) calibrated -= 6;
  else if (hardGaps.length === 1) calibrated -= 3;

  return Math.max(0, Math.min(100, Math.round(calibrated)));
}

function isHardGapRequirement(requirement: JobRequirement): boolean {
  return (
    requirement.intent === "MUST_HAVE" &&
    (requirement.kind === "TOOL" ||
      requirement.kind === "CERTIFICATION" ||
      requirement.kind === "EDUCATION" ||
      requirement.kind === "EXPERIENCE_YEARS")
  );
}

export function isStructuralHygieneRequirement(
  requirementText: string,
  requirement?: JobRequirement
): boolean {
  const text = `${requirementText} ${requirement?.text ?? ""}`.toLowerCase();

  if (
    /\b(resume structure|ats structure|ats[-\s]?friendly|parseable|parser|formatting|section heading|section headings|malformed|clean date|date formatting|work history details|role descriptions?)\b/.test(text)
  ) {
    return true;
  }

  if (
    /\b(education|school|college|university|program|degree|diploma|certificate|credential)\b/.test(text) &&
    /\b(year|years|date|dates|completion|completed|graduation|attended|missing field|institution detail)\b/.test(text)
  ) {
    return true;
  }

  if (
    /\b(role|job|work|employment|company|position)\b/.test(text) &&
    /\b(date range|date ranges|dates|years worked|missing date|location cleanup)\b/.test(text)
  ) {
    return true;
  }

  return requirement?.intent === "IGNORE";
}

// Legacy fallback copy. The primary UI now uses fitAssessment so hard
// requirements can override raw score bands.
export function formatScore(score: number): string {
  if (score >= 81) {
    return "Highly aligned, the candidate's experience maps strongly to the hiring intent.";
  }
  if (score >= 61) {
    return "Strong fit with clarification opportunities, core alignment is visible and a few details could sharpen the positioning.";
  }
  if (score >= 41) {
    return "Moderate fit with missing evidence, meaningful transferable overlap is present but role-specific proof is still needed.";
  }
  if (score >= 21) {
    return "Some transferable overlap, the resume shows adjacent strengths but needs clearer role-specific evidence.";
  }
  return "Limited overlap, the current resume shows little evidence for this hiring intent.";
}
