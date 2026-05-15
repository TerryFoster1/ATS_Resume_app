import type { AnalysisResult, JobRequirement, MatchEvaluation } from "../types";
import { interpretRequirementForQuestion } from "./requirementIntentInterpreter";

export type FitBand =
  | "limited"
  | "transferable"
  | "moderate"
  | "strong"
  | "highly_aligned";

export type FitAssessment = {
  band: FitBand;
  headline: string;
  subtext: string;
  scoreSummary: string;
  missingHardRequirements: string[];
  missingMustHaveRequirements: string[];
};

export function assessFit(args: {
  score: number;
  requirements: JobRequirement[];
  matches: MatchEvaluation[];
  renderedQuestionCount?: number;
  hasAnsweredContext?: boolean;
  hasReanalyzed?: boolean;
}): FitAssessment {
  const requirementsById = new Map(args.requirements.map((r) => [r.id, r]));
  const hardMissing = args.matches.filter((match) => {
    const requirement = requirementsById.get(match.requirementId);
    return Boolean(requirement && isHardRequirement(requirement) && isGap(match));
  });
  const mustHaveMissing = args.matches.filter((match) => {
    const requirement = requirementsById.get(match.requirementId);
    return Boolean(
      requirement &&
        requirement.intent === "MUST_HAVE" &&
        !isHardRequirement(requirement) &&
        isGap(match)
    );
  });

  const noQuestions = (args.renderedQuestionCount ?? 1) === 0;
  const hasAnsweredContext = Boolean(args.hasAnsweredContext);
  const hardMissingCount = hardMissing.length;
  const mustHaveMissingCount = mustHaveMissing.length;
  let band: FitBand;

  if (args.score <= 20 && hardMissingCount >= 2) {
    band = "limited";
  } else if (args.score <= 40) {
    band = "transferable";
  } else if (args.score <= 60 || hardMissingCount > 0 || mustHaveMissingCount >= 3) {
    band = "moderate";
  } else if (args.score <= 80 || mustHaveMissingCount > 0 || !noQuestions) {
    band = "strong";
  } else {
    band = "highly_aligned";
  }

  if (noQuestions && hardMissingCount === 0 && mustHaveMissingCount === 0 && args.score >= 81) {
    band = args.hasReanalyzed && hasAnsweredContext ? "strong" : "highly_aligned";
  }

  const copy = copyForBand(band, {
    noQuestions,
    hasAnsweredContext,
    hasReanalyzed: Boolean(args.hasReanalyzed)
  });

  return {
    band,
    headline: copy.headline,
    subtext: copy.subtext,
    scoreSummary: copy.scoreSummary,
    missingHardRequirements: hardMissing.map((match) => match.requirementText),
    missingMustHaveRequirements: mustHaveMissing.map((match) => match.requirementText)
  };
}

export function scoreSummaryForAnalysis(
  score: number,
  requirements: JobRequirement[],
  matches: MatchEvaluation[]
): string {
  return assessFit({ score, requirements, matches }).scoreSummary;
}

export function isHardRequirement(requirement: JobRequirement): boolean {
  const text = requirement.text.toLowerCase();
  return (
    requirement.kind === "CERTIFICATION" ||
    (requirement.kind === "EDUCATION" && /\brequired|must|license|licence|certification|credential\b/.test(text)) ||
    (requirement.kind === "EXPERIENCE_YEARS" && requirement.intent === "MUST_HAVE") ||
    /\b(license|licence|licensed|certification|certified|apprentice|apprenticeship|journeyperson|journeyman|red seal|trade certificate|trade credential|driver'?s license|legal eligibility|eligible to work|must be able to lift|on-site|onsite|travel required)\b/.test(text) ||
    isTradeRequirementText(text)
  );
}

export function isTradeRequirementText(text: string): boolean {
  const lowered = text.toLowerCase();
  const hasTradeDomain =
    /\b(plumb|pipefitt|pipe fitting|hvac|electrical|electrician|welding|carpentry|construction code|building code|safety code|fixtures?|water heater|drain|sewer|gas line)\b/i.test(
      lowered
    );
  const hasTradeAction =
    /\b(install(?:ing|ation)?|repair(?:ing)?|maintain(?:ing|ed)?|maintenance|service calls?)\b/i.test(
      lowered
    );
  const hasTradeObject =
    /\b(plumbing systems?|pipes?|fixtures?|water heaters?|drains?|sewers?|gas lines?|trade|construction|building systems?)\b/i.test(
      lowered
    );
  return hasTradeDomain || (hasTradeAction && hasTradeObject);
}

export function directQuestionForRequirement(requirement: JobRequirement): string {
  const interpreted = interpretRequirementForQuestion(requirement);
  return interpreted.questionText || "Have you managed projects, workflows, customers, tools, reports, or documentation that relate to this role? What did you own and what improved?";
}

function isGap(match: MatchEvaluation): boolean {
  return match.classification === "MISSING" || match.classification === "CLARIFY";
}

function copyForBand(
  band: FitBand,
  context: { noQuestions: boolean; hasAnsweredContext: boolean; hasReanalyzed: boolean }
): { headline: string; subtext: string; scoreSummary: string } {
  if (context.noQuestions) {
    if (context.hasAnsweredContext && context.hasReanalyzed) {
      return {
        headline: "Your added context strengthened the match.",
        subtext: "We have enough detail to generate the resume and cover letter.",
        scoreSummary: "Strong fit, your added context improved the role-specific evidence."
      };
    }
    if (band === "limited") {
      return {
        headline: "Limited overlap based on the current resume.",
        subtext: "The resume does not show much evidence for this hiring intent yet.",
        scoreSummary: "Limited overlap, the current resume shows little role-specific evidence."
      };
    }
    if (band === "transferable") {
      return {
        headline: "Some transferable overlap is present.",
        subtext: "The resume shows adjacent strengths, but role-specific evidence is still limited.",
        scoreSummary: "Some transferable overlap, more role-specific evidence would strengthen this."
      };
    }
    if (band === "moderate") {
      return {
        headline: "Moderate fit with missing evidence.",
        subtext: "There is meaningful overlap, but a few role-specific signals are still unclear.",
        scoreSummary: "Moderate fit with missing evidence."
      };
    }
    if (band === "strong") {
      return {
        headline: "You look like a strong fit for this role.",
        subtext: "We found enough evidence to generate a targeted resume. Optional details can make it sharper.",
        scoreSummary: "Strong fit, most high-impact requirements are covered."
      };
    }
    return {
      headline: "You\u2019re ready to generate a tailored resume.",
      subtext: "We found enough evidence to generate a clean ATS-friendly resume for this role.",
      scoreSummary: "Highly aligned, the core hiring signals are clearly supported."
    };
  }

  if (band === "limited") {
    return {
      headline: "Limited overlap based on the current resume.",
      subtext:
        "The posting appears to require experience or credentials that are not currently shown. If you have related experience, the questions can help us surface it.",
      scoreSummary:
        "Limited overlap, core hiring signals are not yet visible in the resume."
    };
  }
  if (band === "transferable") {
    return {
      headline: "Some transferable overlap is present.",
      subtext:
        "Your resume shows adjacent strengths, and a few answers can help us understand whether the role-specific experience is there.",
      scoreSummary:
        "Some transferable overlap, role-specific evidence is still unclear."
    };
  }
  if (band === "moderate") {
    return {
      headline: "Moderate fit with missing evidence.",
      subtext:
        "Your background shows meaningful alignment, and a few clarifications can strengthen the positioning.",
      scoreSummary:
        "Moderate fit with missing evidence, transferable alignment is present but some role-specific proof needs confirmation."
    };
  }
  if (band === "strong") {
    return {
      headline: "You look like a strong fit for this role.",
      subtext:
        "We have enough evidence to generate a targeted resume. Optional answers can make it sharper.",
      scoreSummary:
        "Strong fit, most high-impact requirements are covered with only minor clarifications remaining."
    };
  }
  return {
    headline: "This is highly aligned with your experience.",
    subtext: "We found enough evidence to generate a clean ATS-friendly resume for this role.",
    scoreSummary: "Highly aligned, the core hiring signals are clearly supported."
  };
}

function cleanRequirementForQuestion(text: string): string {
  return text
    .replace(/\b(must be|must have|required|requirement|proficiency with|proficient with)\b/gi, "")
    .replace(/[.:;]+$/g, "")
    .trim() || text;
}
