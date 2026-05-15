// Barrel for the prompt modules.

export {
  ANALYZE_SYSTEM,
  ANALYZE_SCHEMA,
  buildAnalyzeUserPrompt
} from "./analyzePrompt";
export type {
  AnalyzeToolInput,
  AnalyzeReqOut,
  AnalyzeEvidenceOut,
  AnalyzeMatchOut
} from "./analyzePrompt";

export {
  REWRITE_SYSTEM,
  buildRewriteUserPrompt
} from "./rewritePrompt";

export {
  COVER_LETTER_SYSTEM,
  buildCoverLetterUserPrompt
} from "./coverLetterPrompt";

export {
  ATS_REVIEW_SYSTEM,
  buildAtsReviewUserPrompt
} from "./atsReviewPrompt";
