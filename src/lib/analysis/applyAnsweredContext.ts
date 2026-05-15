import type { AnalysisResult, FollowUp, MatchEvaluation } from "../types";
import { calculateScore } from "./calculateScore";
import {
  buildRequirementConfidence,
  semanticScoreFloorFromConfidence
} from "./requirementConfidence";
import { assessFit } from "./fitAssessment";

export function applyAnsweredContextToAnalysis(args: {
  analysis: AnalysisResult;
  previousAnalysis: AnalysisResult;
  answers: Record<string, string>;
}): AnalysisResult {
  const answeredById = new Map(
    Object.entries(args.answers)
      .map(([id, answer]) => [id, answer.trim()] as const)
      .filter(([, answer]) => answer && !isNegativeAnswer(answer))
  );
  if (answeredById.size === 0) return args.analysis;

  const previousTextById = new Map(
    args.previousAnalysis.matches.map((match) => [
      match.requirementId,
      match.requirementText
    ])
  );
  const answeredByText = new Map<string, string>();
  for (const [id, answer] of answeredById) {
    const text = previousTextById.get(id);
    if (text) answeredByText.set(normalizeRequirementText(text), answer);
  }

  const matches = args.analysis.matches.map((match) =>
    applyAnswerToMatch(match, answeredById, answeredByText)
  );

  let { score, scoreSummary, buckets } = calculateScore(
    matches,
    args.analysis.requirements
  );
  const requirementConfidence = buildRequirementConfidence({
    requirements: args.analysis.requirements,
    evidence: args.analysis.evidence,
    matches
  });
  const semanticFloor = semanticScoreFloorFromConfidence({
    requirementConfidence,
    evidenceCount: args.analysis.evidence.length
  });
  if (score < semanticFloor) {
    score = semanticFloor;
    scoreSummary = assessFit({
      score,
      requirements: args.analysis.requirements,
      matches
    }).scoreSummary;
  }
  return {
    ...args.analysis,
    matches,
    buckets,
    score,
    semanticFitScore: score,
    requirementConfidence,
    scoreSummary,
    followUps: filterAnsweredFollowUps({
      followUps: args.analysis.followUps,
      previousTextById,
      answeredById,
      answeredByText
    })
  };
}

export function followUpsToAnswers(followUps: FollowUp[]): Record<string, string> {
  return Object.fromEntries(
    followUps
      .map((followUp) => [
        followUp.requirementId,
        followUp.answer.trim()
      ] as const)
      .filter(([, answer]) => answer.length > 0)
  );
}

function applyAnswerToMatch(
  match: MatchEvaluation,
  answeredById: Map<string, string>,
  answeredByText: Map<string, string>
): MatchEvaluation {
  const answer =
    answeredById.get(match.requirementId) ??
    answeredByText.get(normalizeRequirementText(match.requirementText));
  if (!answer || match.classification === "MATCH") return match;

  return {
    ...match,
    classification: "MATCH",
    confidence: match.confidence === "LOW" ? "MEDIUM" : match.confidence,
    lens: "SEMANTIC",
    reasoning: `Candidate added context confirming this requirement: ${summarizeAnswer(answer)}`,
    clarificationQuestion: undefined
  };
}

function filterAnsweredFollowUps(args: {
  followUps: FollowUp[];
  previousTextById: Map<string, string>;
  answeredById: Map<string, string>;
  answeredByText: Map<string, string>;
}): FollowUp[] {
  return args.followUps.filter((followUp) => {
    const requirementText = args.previousTextById.get(followUp.requirementId);
    return !(
      args.answeredById.has(followUp.requirementId) ||
      (requirementText &&
        args.answeredByText.has(normalizeRequirementText(requirementText)))
    );
  });
}

function normalizeRequirementText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function summarizeAnswer(answer: string): string {
  const compact = answer.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function isNegativeAnswer(answer: string): boolean {
  return /\b(no|none|not applicable|n\/a|do not|don't|did not|haven't|have not)\b/i.test(
    answer
  );
}
