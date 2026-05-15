import type {
  AnalysisResult,
  JobRequirement,
  MatchEvaluation,
  ResumeEvidence
} from "../types";
import { findToolCategory } from "../knowledge/toolMappings";
import { loose } from "../utils/normalizeText";
import { calculateScore } from "./calculateScore";
import { enforceDecisions } from "./enforceDecisions";
import { buildDeterministicEvidence } from "./extractAndMatch";
import { generateClarifications } from "./generateClarifications";
import {
  buildRequirementConfidence,
  semanticScoreFloorFromConfidence
} from "./requirementConfidence";
import { runResumeStructureChecks } from "../atsChecker";
import { assessFit } from "./fitAssessment";

export function fastRescoreWithExistingRequirements(args: {
  resumeText: string;
  baseline: AnalysisResult;
}): AnalysisResult {
  const evidence = buildDeterministicEvidence({
    resumeText: args.resumeText,
    existing: []
  });
  const matches = args.baseline.requirements.map((requirement) =>
    evaluateRequirement(requirement, evidence)
  );
  const { matches: enforcedMatches } = enforceDecisions({
    requirements: args.baseline.requirements,
    evidence,
    matches
  });
  let { score, scoreSummary, buckets } = calculateScore(
    enforcedMatches,
    args.baseline.requirements
  );
  const requirementConfidence = buildRequirementConfidence({
    requirements: args.baseline.requirements,
    evidence,
    matches: enforcedMatches
  });
  const semanticFloor = semanticScoreFloorFromConfidence({
    requirementConfidence,
    evidenceCount: evidence.length
  });
  if (score < semanticFloor) {
    score = semanticFloor;
    scoreSummary = assessFit({
      score,
      requirements: args.baseline.requirements,
      matches: enforcedMatches
    }).scoreSummary;
  }
  const followUps = generateClarifications({
    matches: enforcedMatches,
    requirements: args.baseline.requirements
  });

  return {
    requirements: args.baseline.requirements,
    evidence,
    matches: enforcedMatches,
    buckets,
    followUps,
    score,
    semanticFitScore: score,
    atsStructureHealthScore: computeStructureHealthScore(args.resumeText),
    requirementConfidence,
    writingLocale: args.baseline.writingLocale,
    scoreSummary
  };
}

function computeStructureHealthScore(resumeText: string): number {
  const checks = runResumeStructureChecks(resumeText);
  if (checks.length === 0) return 0;
  const passed = checks.filter((check) => check.passed).length;
  return Math.round((passed / checks.length) * 100);
}

function evaluateRequirement(
  requirement: JobRequirement,
  evidence: ResumeEvidence[]
): MatchEvaluation {
  const supporting = evidence.filter((item) =>
    evidenceSupportsRequirement(requirement, item)
  );
  const years = relevantYears(requirement, supporting);
  const yearsRequired = requirement.yearsRequired?.min;

  if (
    requirement.kind === "EXPERIENCE_YEARS" &&
    yearsRequired !== undefined &&
    years >= yearsRequired
  ) {
    return match(requirement, supporting, "MATCH", "EXPERIENCE_YEARS", `Resume shows approximately ${years} year(s) of related experience.`);
  }

  if (supporting.length > 0) {
    const strong =
      requirement.kind === "TOOL" ||
      requirement.skillClusters.some((cluster) =>
        supporting.some((item) => item.skillClusters.includes(cluster))
      ) ||
      hasDirectTextOverlap(requirement.text, supporting.map((item) => item.text).join(" "));
    return match(
      requirement,
      supporting,
      strong ? "MATCH" : "PARTIAL",
      strong ? "SEMANTIC" : "CLUSTER_TRANSFER",
      strong
        ? "Generated resume contains evidence for this requirement."
        : "Generated resume contains related evidence, but the exact scope may still be unclear."
    );
  }

  return match(
    requirement,
    [],
    requirement.intent === "PREFERRED" ? "CLARIFY" : "MISSING",
    "NONE",
    "No matching evidence was detected in the current resume."
  );
}

function match(
  requirement: JobRequirement,
  evidence: ResumeEvidence[],
  classification: MatchEvaluation["classification"],
  lens: MatchEvaluation["lens"],
  reasoning: string
): MatchEvaluation {
  return {
    requirementId: requirement.id,
    requirementText: requirement.text,
    requirementImportance: requirement.importance,
    classification,
    confidence: evidence.length > 0 ? "MEDIUM" : "LOW",
    lens,
    evidenceIds: evidence.slice(0, 5).map((item) => item.id),
    reasoning
  };
}

function evidenceSupportsRequirement(
  requirement: JobRequirement,
  evidence: ResumeEvidence
): boolean {
  if (hasDirectTextOverlap(requirement.text, evidence.text)) return true;
  if (
    requirement.skillClusters.length > 0 &&
    requirement.skillClusters.some((cluster) => evidence.skillClusters.includes(cluster))
  ) {
    return true;
  }
  if (requirement.toolCategory) {
    const category = findToolCategory(requirement.text);
    if (
      category &&
      evidence.toolsNamed.some((tool) =>
        category.tools.some((knownTool) => loose(knownTool) === loose(tool))
      )
    ) {
      return true;
    }
  }
  return false;
}

function hasDirectTextOverlap(requirementText: string, evidenceText: string): boolean {
  const reqTerms = importantTerms(requirementText);
  if (reqTerms.length === 0) return false;
  const evidence = loose(evidenceText);
  const hits = reqTerms.filter((term) => evidence.includes(term));
  return hits.length >= Math.min(2, reqTerms.length);
}

function importantTerms(text: string): string[] {
  const stop = new Set([
    "and",
    "the",
    "with",
    "for",
    "you",
    "will",
    "must",
    "have",
    "required",
    "experience",
    "years",
    "year",
    "ability",
    "knowledge",
    "skills",
    "skill"
  ]);
  return loose(text)
    .split(" ")
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 10);
}

function relevantYears(requirement: JobRequirement, evidence: ResumeEvidence[]): number {
  const clustered = evidence.filter((item) =>
    requirement.skillClusters.length === 0
      ? true
      : requirement.skillClusters.some((cluster) => item.skillClusters.includes(cluster))
  );
  return Math.round(
    clustered.reduce((sum, item) => sum + (item.dateRange?.approximateYears ?? 0), 0)
  );
}
