// Shared types — the schemas the analysis pipeline, API routes, and UI all
// consume. Session-only; nothing is persisted.
//
// Vocabulary follows the handoff (§29):
//   MATCH      — resume clearly proves the requirement (direct, semantic,
//                cluster transfer, or experience-threshold).
//   PARTIAL    — resume shows adjacent / weaker evidence.
//   CLARIFY    — JD names a specific tool/cert/system the resume doesn't
//                directly mention but candidate plausibly has comparable
//                experience. Triggers a follow-up question.
//   MISSING    — no plausible trace and no transferable bridge. Rare under
//                the Decision Enforcement Layer (§12).
//
// Importance is HIGH / MEDIUM / LOW, weights live in matchScore.ts.

import type { ClusterId } from "./knowledge/skillClusters";
import type { WritingLocale } from "./writingLocale";

// -----------------------------------------------------------------------------
// Core enums
// -----------------------------------------------------------------------------

export type MatchClassification = "MATCH" | "PARTIAL" | "CLARIFY" | "MISSING";

export type Importance = "HIGH" | "MEDIUM" | "LOW";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

// What kind of thing the requirement is. Drives prompting and follow-up
// generation — a TOOL-typed CLARIFY usually deserves a sibling-tool question
// ("Have you used Salesforce, HubSpot, or another CRM?"), while a
// RESPONSIBILITY rarely does.
export type RequirementKind =
  | "TOOL"
  | "CERTIFICATION"
  | "EXPERIENCE_YEARS"
  | "RESPONSIBILITY"
  | "INDUSTRY"
  | "OUTCOME"
  | "SENIORITY"
  | "EDUCATION"
  | "SOFT_SKILL"
  | "OTHER";

// Hiring intent — separates "candidate must already have this" from "this is
// what the hire will do after being hired". Without this, we mis-flag
// ordinary job duties as MISSING (the "prepare meals" bug from the
// previous version).
export type RequirementIntent =
  | "MUST_HAVE"        // candidate must already prove this
  | "PREFERRED"        // nice-to-have / asset
  | "RESPONSIBILITY"   // duty the hire will perform after being hired
  | "TRANSFERABLE"     // adjacent capability, can inform tailoring
  | "IGNORE";          // EEO, benefits, culture copy — filtered out

// -----------------------------------------------------------------------------
// Job requirement (parsed from the posting)
// -----------------------------------------------------------------------------

export interface JobRequirement {
  id: string;
  // Exact wording from the JD, lightly normalised.
  text: string;
  kind: RequirementKind;
  intent: RequirementIntent;
  importance: Importance;
  // Semantic clusters this requirement maps to. The matcher uses these to
  // find transferable evidence in the resume.
  skillClusters: ClusterId[];
  // For EXPERIENCE_YEARS requirements: parsed floor / ceiling. Undefined
  // when the requirement is not a years-of-experience demand.
  yearsRequired?: { min?: number; max?: number };
  // For TOOL requirements: the tool category the matcher should use when
  // generating a sibling-tool clarification question. Undefined when the
  // tool is not in our category catalogue.
  toolCategory?: string;
}

// -----------------------------------------------------------------------------
// Resume evidence (extracted from the candidate's resume)
// -----------------------------------------------------------------------------

export interface ResumeEvidence {
  id: string;
  // Source location: an employer + title pair, an education line, a skills
  // section, etc. Used to anchor the evidence in the rewrite.
  source: {
    company?: string;
    title?: string;
    section: "EXPERIENCE" | "EDUCATION" | "SKILLS" | "SUMMARY" | "OTHER";
  };
  // The literal bullet / line the evidence comes from.
  text: string;
  // Semantic clusters this evidence demonstrates.
  skillClusters: ClusterId[];
  // Tools/platforms/systems explicitly named in the bullet (raw strings,
  // matched case-insensitively). Used to resolve TOOL requirements.
  toolsNamed: string[];
  // Date range and approximate years for this role. Aggregated across roles
  // to satisfy EXPERIENCE_YEARS requirements via the cluster.
  dateRange?: {
    start?: string;
    end?: string;
    approximateYears?: number;
  };
}

// -----------------------------------------------------------------------------
// Match evaluation (one row per JobRequirement)
// -----------------------------------------------------------------------------

// Which lens decided the classification. Useful for both rendering ("Lens:
// Cluster transfer (Customer Service → Client Relationship Management)") and
// for the Decision Enforcement Layer's audit log.
export type ReasoningLens =
  | "DIRECT"            // exact tool/term mentioned in resume
  | "SEMANTIC"          // synonyms / paraphrases match
  | "CLUSTER_TRANSFER"  // resume cluster bridges to JD cluster
  | "EXPERIENCE_YEARS"  // candidate years satisfy required floor
  | "STRONGER_EXPERIENCE" // more advanced / longer experience subsumes
  | "TOOL_CATEGORY"     // sibling tool in same category
  | "NONE";             // no lens fired

export interface MatchEvaluation {
  requirementId: string;
  // Snapshot of the requirement text and importance at evaluation time, so
  // downstream renderers don't need to re-join with JobRequirement.
  requirementText: string;
  requirementImportance: Importance;
  classification: MatchClassification;
  confidence: Confidence;
  // Which reasoning lens fired (if any).
  lens: ReasoningLens;
  // IDs of resume evidence rows that supported the classification.
  evidenceIds: string[];
  // One plain-language sentence explaining the classification.
  reasoning: string;
  // Only set on PARTIAL / CLARIFY. Question the rewrite engine can ask the
  // candidate to confirm or strengthen the evidence.
  clarificationQuestion?: string;
}

export type RequirementEvidenceBand = "strong" | "moderate" | "weak" | "absent";

export interface RequirementConfidence {
  requirementId: string;
  requirementText: string;
  category: RequirementKind;
  importance: Importance;
  sourceSection?: string;
  evidenceConfidence: number;
  evidenceBand: RequirementEvidenceBand;
  evidenceFound: string[];
  evidenceType: ReasoningLens;
  questionNeeded: boolean;
  questionPriority: number;
  reason: string;
}

// -----------------------------------------------------------------------------
// Resume strategy (how to position the candidate for this specific JD)
// -----------------------------------------------------------------------------

export interface PositioningSubtitle {
  company: string;
  title: string;
  // Pipe-separated phrasing fragments — e.g. "Client Relationship Management
  // | Account Support | CRM-Based Customer Operations". Title itself is NOT
  // renamed (handoff §20).
  subtitle: string;
}

export interface BulletReframe {
  // Original resume bullet (verbatim).
  original: string;
  // Reframed bullet — same facts, repositioned vocabulary.
  reframed: string;
  // Which clusters the reframe leans into.
  clusters: ClusterId[];
}

export interface ResumeStrategy {
  // Top-of-resume positioning summary (3-5 sentences).
  summary: string;
  // Per-role positioning subtitles.
  subtitles: PositioningSubtitle[];
  // Per-bullet reframes the rewrite engine should apply.
  bulletReframes: BulletReframe[];
  // Skill-section additions — clusters / phrases the resume should surface
  // because the JD demands them and the resume already proves them.
  surfacedSkills: string[];
}

// -----------------------------------------------------------------------------
// Follow-up question (asked of the candidate when CLARIFY fires)
// -----------------------------------------------------------------------------

export interface FollowUp {
  id: string;
  requirementId: string;
  question: string;
  // Empty string until the user answers.
  answer: string;
  // Optional sibling-tool list shown alongside the question to lower
  // friction ("Salesforce or comparable: HubSpot, Zoho, Pipedrive").
  alternativeTools?: string[];
}

// -----------------------------------------------------------------------------
// Analysis result (what /api/analyze returns)
// -----------------------------------------------------------------------------

export interface AnalysisResult {
  requirements: JobRequirement[];
  evidence: ResumeEvidence[];
  matches: MatchEvaluation[];
  // Buckets for convenient rendering — same matches, partitioned by class.
  buckets: {
    strengths: MatchEvaluation[];
    partials: MatchEvaluation[];
    clarifications: MatchEvaluation[];
    missing: MatchEvaluation[];
  };
  followUps: FollowUp[];
  score: number;
  semanticFitScore?: number;
  atsStructureHealthScore?: number;
  requirementConfidence?: RequirementConfidence[];
  writingLocale?: WritingLocale;
  // Human-readable description of the score (e.g. "Strong match — most
  // requirements proven, a few clarifications recommended").
  scoreSummary: string;
  // Set when the analysis pipeline fell back to a degraded path (LLM error,
  // empty resume, etc.). Surfaces in the UI so failures are visible.
  fallbackReason?: string;
}

// -----------------------------------------------------------------------------
// ATS check
// -----------------------------------------------------------------------------

export interface AtsRuleResult {
  rule: string;
  passed: boolean;
  detail?: string;
}

// Companion shape used by atsChecker.ts for the keyword-coverage rule.
// Derived from AnalysisResult by extractKeywords() in jdKeywords.ts — not
// produced by an LLM, just a convenience structure pulled out of the
// MUST_HAVE / PREFERRED requirement lists.
export interface JdKeywords {
  required: string[];
  preferred: string[];
}

// -----------------------------------------------------------------------------
// Session state
// -----------------------------------------------------------------------------

export interface SessionState {
  resumeText: string;
  jobPostText: string;
  // Full analysis result. Empty / undefined before /api/analyze runs.
  analysis?: AnalysisResult;
  // User-supplied answers to follow-up questions. Merged into the rewrite
  // pipeline.
  followUps: FollowUp[];
  // Final tailored outputs.
  tailoredResume: string;
  tailoredCoverLetter: string;
  // Re-scored AnalysisResult after tailoring. Optional — set by /api/rescore
  // after the tailor pass completes.
  finalAnalysis?: AnalysisResult;
  atsReport: AtsRuleResult[];
  // Number of rewrite passes that have fired (0 = none yet).
  revisionPass: number;
}

// -----------------------------------------------------------------------------
// API contracts
// -----------------------------------------------------------------------------

export interface ParseResumeResponse {
  text: string;
  warning?: string;
  structured?: {
    roles: Array<{
      title?: string;
      company?: string;
      location?: string;
      dateRange?: string;
      bullets: string[];
    }>;
    education: string[];
    skills: string[];
  };
}

export interface AnalyzeRequest {
  resumeText: string;
  jobPostText: string;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
}

export interface GenerateRequest {
  resumeText: string;
  jobPostText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
  writingLocale?: WritingLocale;
}

export interface GenerateResponse {
  resume: string;
  coverLetter: string;
  // Strategy the rewrite engine produced — surfaced for diagnostic UI.
  strategy?: ResumeStrategy;
}

export interface RescoreRequest {
  resumeText: string;       // tailored resume
  jobPostText: string;
  // Original analysis (so the rescore reuses the parsed requirements rather
  // than re-extracting them — keeps the before/after comparison
  // apples-to-apples).
  baseline: AnalysisResult;
  followUps: FollowUp[];
}

export interface RescoreResponse {
  analysis: AnalysisResult;
}

export interface CheckRequest {
  resume: string;
  coverLetter: string;
  jobPostText: string;
}

export interface CheckResponse {
  report: AtsRuleResult[];
  passed: boolean;
}
