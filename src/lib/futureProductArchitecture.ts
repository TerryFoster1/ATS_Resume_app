import type {
  AnalysisResult,
  FollowUp,
  RequirementConfidence,
  ResumeEvidence
} from "./types";

export type CareerMemorySnapshot = {
  savedResumes: SavedResumeRecord[];
  answeredClarifications: AnsweredClarificationRecord[];
  starStories: StarStoryRecord[];
  recurringSkills: string[];
  preferredIndustries: string[];
  strongestPositioningCategories: string[];
  priorJobAnalyses: PriorJobAnalysisRecord[];
  interviewPrepHistory: InterviewPrepRecord[];
};

export type SavedResumeRecord = {
  id: string;
  label: string;
  resumeText: string;
  extractedEvidence: ResumeEvidence[];
  createdAt: string;
  updatedAt: string;
};

export type AnsweredClarificationRecord = {
  requirementId: string;
  question: string;
  answer: string;
  relatedJobText?: string;
  reusableForFutureRoles: boolean;
};

export type StarStoryRecord = {
  id: string;
  situation?: string;
  task?: string;
  action: string;
  result?: string;
  metrics?: string[];
  skills: string[];
  sourceRole?: string;
};

export type PriorJobAnalysisRecord = {
  id: string;
  targetRole: string;
  company?: string;
  jobPostText: string;
  analysis: Pick<AnalysisResult, "score" | "semanticFitScore" | "requirements" | "requirementConfidence">;
  followUps: FollowUp[];
  createdAt: string;
};

export type InterviewPrepContext = {
  jobPostText: string;
  resumeText: string;
  followUps: FollowUp[];
  requirementConfidence: RequirementConfidence[];
  recruiterRisks: string[];
  transferableStrengths: string[];
  missingHardSkills: string[];
};

export type InterviewPrepRecord = {
  id: string;
  context: InterviewPrepContext;
  practiceQuestions: string[];
  suggestedStories: StarStoryRecord[];
  createdAt: string;
};

export type AccessTier = "free" | "paid";

export type OutputEntitlements = {
  tier: AccessTier;
  canViewFullResume: boolean;
  canViewFullCoverLetter: boolean;
  canCopyText: boolean;
  canDownloadTxt: boolean;
  canDownloadPdf: boolean;
  canEditExports: boolean;
  canSaveHistory: boolean;
  canUseInterviewPrep: boolean;
};

export const FREE_OUTPUT_ENTITLEMENTS: OutputEntitlements = {
  tier: "free",
  canViewFullResume: true,
  canViewFullCoverLetter: false,
  canCopyText: true,
  canDownloadTxt: false,
  canDownloadPdf: false,
  canEditExports: false,
  canSaveHistory: false,
  canUseInterviewPrep: false
};

export const PAID_OUTPUT_ENTITLEMENTS: OutputEntitlements = {
  tier: "paid",
  canViewFullResume: true,
  canViewFullCoverLetter: true,
  canCopyText: true,
  canDownloadTxt: true,
  canDownloadPdf: true,
  canEditExports: true,
  canSaveHistory: true,
  canUseInterviewPrep: true
};
