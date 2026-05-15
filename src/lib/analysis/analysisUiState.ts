import type { FitAssessment } from "./fitAssessment";

export type AnalysisUiStateKind =
  | "error"
  | "ready"
  | "questions"
  | "needs_evidence"
  | "parser_uncertain";

export type AnalysisUiState = {
  state: AnalysisUiStateKind;
  heading: string;
  subtext: string;
  matchCardTitle: string;
  matchCardSubtext: string;
  primaryCtaLabel: string;
  canGenerate: boolean;
  useCautiousCta: boolean;
  showQuestionsHeader: boolean;
};

export function deriveAnalysisUiState(args: {
  hasData: boolean;
  score: number;
  fit: FitAssessment;
  renderedQuestionCount: number;
  actionableGapCount: number;
  structuralIssueCount: number;
  unansweredRequiredStructuralCount: number;
}): AnalysisUiState {
  if (!args.hasData) {
    return {
      state: "error",
      heading: "We couldn't complete the analysis.",
      subtext:
        "Please go back and try analyzing again. If it keeps happening, paste a shorter job posting or resume excerpt.",
      matchCardTitle: "Analysis incomplete.",
      matchCardSubtext: "We could not build a reliable requirement map for this posting.",
      primaryCtaLabel: "Generate resume and cover letter",
      canGenerate: false,
      useCautiousCta: true,
      showQuestionsHeader: false
    };
  }

  if (args.unansweredRequiredStructuralCount > 0) {
    return {
      state: "parser_uncertain",
      heading: "A few resume details could make this stronger.",
      subtext:
        "Add what you know, or skip anything you are unsure about. We can still generate with the evidence already available.",
      matchCardTitle: "Some resume structure details are missing.",
      matchCardSubtext:
        "Dates and education years improve ATS parsing, but blank answers will be treated as skipped.",
      primaryCtaLabel: "Generate with available details",
      canGenerate: true,
      useCautiousCta: true,
      showQuestionsHeader: true
    };
  }

  if (args.renderedQuestionCount > 0) {
    return {
      state: "questions",
      heading: "Answer a few questions so we can tailor this properly.",
      subtext:
        "These are based on the job posting and help us add relevant details to the generated resume.",
      matchCardTitle: summaryForScore(args.score),
      matchCardSubtext:
        "This is the initial read before your answers are used in the tailored draft.",
      primaryCtaLabel:
        args.score < 80 ? "Generate with my answers" : "Generate resume and cover letter",
      canGenerate: true,
      useCautiousCta: false,
      showQuestionsHeader: true
    };
  }

  if (args.score < 61 || args.fit.band === "limited" || args.fit.band === "transferable" || args.fit.band === "moderate") {
    const limited = args.score <= 20 || args.fit.band === "limited";
    return {
      state: "needs_evidence",
      heading: limited
        ? "Limited overlap based on the current resume."
        : summaryForScore(args.score),
      subtext:
        args.actionableGapCount > 0
          ? "Your background shows relevant alignment, and clarifying a few role-specific areas could strengthen the draft."
          : "We found transferable overlap, but the current resume would benefit from clearer role-specific evidence.",
      matchCardTitle: summaryForScore(args.score),
      matchCardSubtext:
        "This reflects recruiter-style alignment confidence, not an ATS pass/fail score.",
      primaryCtaLabel: limited ? "Generate with available evidence" : "Generate resume and cover letter",
      canGenerate: true,
      useCautiousCta: limited,
      showQuestionsHeader: false
    };
  }

  return {
    state: "ready",
    heading: "You're ready to generate a tailored resume.",
    subtext:
      "We found enough evidence in your resume to write an ATS-friendly version for this posting.",
    matchCardTitle: summaryForScore(args.score),
    matchCardSubtext: "This resume gives us enough to tailor the materials.",
    primaryCtaLabel: "Generate resume and cover letter",
    canGenerate: true,
    useCautiousCta: false,
    showQuestionsHeader: false
  };
}

function summaryForScore(score: number): string {
  if (score >= 81) return "Highly aligned.";
  if (score >= 61) return "Strong fit with clarification opportunities.";
  if (score >= 41) return "Moderate fit with missing evidence.";
  if (score >= 21) return "Some transferable overlap.";
  return "Limited overlap.";
}
