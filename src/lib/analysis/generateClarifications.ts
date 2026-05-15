// Build the FollowUp[] the UI presents to the candidate.

import type {
  FollowUp,
  JobRequirement,
  MatchEvaluation
} from "../types";
import { requirementsNeedingFollowUps } from "../utils/evidence";
import { findToolCategory } from "../knowledge/toolMappings";
import {
  getQuestionSuppressionReason,
  validateQuestionForCandidate
} from "./jobAdItems";
import { interpretRequirementForQuestion } from "./requirementIntentInterpreter";

export function generateClarifications(args: {
  matches: MatchEvaluation[];
  requirements: JobRequirement[];
}): FollowUp[] {
  const pairs = requirementsNeedingFollowUps(args.matches, args.requirements)
    .filter(({ requirement }) => !getQuestionSuppressionReason(requirement));
  return pairs.flatMap(({ match, requirement }, i) => {
    const interpretation = interpretRequirementForQuestion(requirement);
    if (!interpretation.shouldAsk) return [];
    const question =
      safeModelQuestion(match.clarificationQuestion, requirement) ||
      interpretation.questionText ||
      defaultQuestion(requirement);

    const alternativeTools = pickAlternatives(requirement);

    const qualityGate = validateQuestionForCandidate({
      question,
      jobAdReference: requirement.text,
      requirement
    });
    if (!qualityGate.passed) return [];

    const f: FollowUp = {
      id: `fu-${i + 1}`,
      requirementId: requirement.id,
      question,
      answer: ""
    };
    if (alternativeTools && alternativeTools.length > 0) {
      f.alternativeTools = alternativeTools;
    }
    return [f];
  });
}

function defaultQuestion(req: JobRequirement): string {
  const interpretation = interpretRequirementForQuestion(req);
  return interpretation.questionText || "Have you managed projects, workflows, customers, tools, reports, or documentation that relate to this role? What did you own and what improved?";
}

function pickAlternatives(req: JobRequirement): string[] | undefined {
  if (req.kind !== "TOOL") return undefined;
  const cat =
    (req.toolCategory && findToolCategory(req.toolCategory)) ||
    findToolCategory(req.text);
  if (!cat) return undefined;
  return cat.tools.slice(0, 5);
}

function safeModelQuestion(
  question: string | undefined,
  requirement: JobRequirement
): string | undefined {
  if (!question) return undefined;
  const qualityGate = validateQuestionForCandidate({
    question,
    jobAdReference: requirement.text,
    requirement
  });
  return qualityGate.passed ? question : undefined;
}
