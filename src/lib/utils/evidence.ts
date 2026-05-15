// Evidence helpers — small utilities used in multiple analysis modules.

import type {
  MatchEvaluation,
  ResumeEvidence,
  JobRequirement
} from "../types";

// Aggregate cluster IDs across a list of evidence items.
export function clustersIn(evidence: ResumeEvidence[]): Set<string> {
  const out = new Set<string>();
  for (const e of evidence) {
    for (const c of e.skillClusters) out.add(c);
  }
  return out;
}

// Sum approximate years across evidence that belongs to any of the given
// clusters. Used by the experience-threshold check.
export function yearsInClusters(
  evidence: ResumeEvidence[],
  clusters: string[]
): number {
  if (clusters.length === 0) return 0;
  const want = new Set(clusters);
  let total = 0;
  for (const e of evidence) {
    if (!e.dateRange?.approximateYears) continue;
    if (e.skillClusters.some((c) => want.has(c))) {
      total += e.dateRange.approximateYears;
    }
  }
  return Math.min(50, total);
}

// Bucket matches by classification — used by the AnalysisResult shape.
export function bucketByClassification(
  matches: MatchEvaluation[]
): {
  strengths: MatchEvaluation[];
  partials: MatchEvaluation[];
  clarifications: MatchEvaluation[];
  missing: MatchEvaluation[];
} {
  const strengths: MatchEvaluation[] = [];
  const partials: MatchEvaluation[] = [];
  const clarifications: MatchEvaluation[] = [];
  const missing: MatchEvaluation[] = [];
  for (const m of matches) {
    if (m.classification === "MATCH") strengths.push(m);
    else if (m.classification === "PARTIAL") partials.push(m);
    else if (m.classification === "CLARIFY") clarifications.push(m);
    else missing.push(m);
  }
  return { strengths, partials, clarifications, missing };
}

// Order matches inside a bucket: highest importance first, then highest
// confidence, then alphabetical to keep render stable across re-renders.
export function rankMatches(matches: MatchEvaluation[]): MatchEvaluation[] {
  const importanceRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const confidenceRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...matches].sort((a, b) => {
    const i =
      importanceRank[a.requirementImportance] -
      importanceRank[b.requirementImportance];
    if (i !== 0) return i;
    const c = confidenceRank[a.confidence] - confidenceRank[b.confidence];
    if (c !== 0) return c;
    return a.requirementText.localeCompare(b.requirementText);
  });
}

// Helper: pick the requirements that need a follow-up question. Only
// CLARIFY (always) and high-importance PARTIAL (selectively) qualify.
export function requirementsNeedingFollowUps(
  matches: MatchEvaluation[],
  requirements: JobRequirement[]
): { match: MatchEvaluation; requirement: JobRequirement }[] {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const out: { match: MatchEvaluation; requirement: JobRequirement }[] = [];
  for (const m of matches) {
    const req = byId.get(m.requirementId);
    if (!req) continue;
    if (
      req.intent === "PREFERRED" &&
      !shouldAskPreferredRequirement(req, m)
    ) {
      continue;
    }
    if (m.classification === "CLARIFY") {
      out.push({ match: m, requirement: req });
    } else if (
      m.classification === "PARTIAL" &&
      req.importance === "HIGH" &&
      m.clarificationQuestion
    ) {
      out.push({ match: m, requirement: req });
    }
  }
  return out;
}

function shouldAskPreferredRequirement(
  req: JobRequirement,
  match: MatchEvaluation
): boolean {
  if (req.kind === "TOOL" || req.kind === "CERTIFICATION") return true;
  if (isLanguageRequirement(req.text)) return false;
  const question = match.clarificationQuestion ?? "";
  if (!question) return false;
  return question.toLowerCase().includes(req.text.toLowerCase());
}

function isLanguageRequirement(text: string): boolean {
  return /\b(french|english|bilingual|multilingual|language proficiency|fluen(?:t|cy)|verbal and written)\b/i.test(
    text
  );
}
