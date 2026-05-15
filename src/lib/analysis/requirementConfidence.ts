import { isStructuralHygieneRequirement } from "../matchScore";
import type {
  JobRequirement,
  MatchEvaluation,
  RequirementConfidence,
  RequirementEvidenceBand,
  ResumeEvidence
} from "../types";
import { hasMetaAdsPlatformSignal } from "./platformSynonyms";

export function buildRequirementConfidence(args: {
  requirements: JobRequirement[];
  evidence: ResumeEvidence[];
  matches: MatchEvaluation[];
}): RequirementConfidence[] {
  const requirementById = new Map(args.requirements.map((req) => [req.id, req]));
  const evidenceById = new Map(args.evidence.map((item) => [item.id, item]));
  const resumeSignal = buildResumeSignal(args.evidence);

  return args.matches.map((match) => {
    const requirement = requirementById.get(match.requirementId);
    const evidence = match.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is ResumeEvidence => Boolean(item));

    const transferableEligible = Boolean(
      requirement && transferableEvidenceEligible(requirement, resumeSignal)
    );
    const confidence = evidenceConfidence(match, requirement, evidence, transferableEligible);
    const band = evidenceBand(confidence);
    const structural = isStructuralHygieneRequirement(match.requirementText, requirement);
    const questionNeeded =
      !structural &&
      confidence < 0.65 &&
      (
        match.requirementImportance === "HIGH" ||
        match.requirementImportance === "MEDIUM" ||
        transferableEligible
      );

    return {
      requirementId: match.requirementId,
      requirementText: match.requirementText,
      category: requirement?.kind ?? "OTHER",
      importance: match.requirementImportance,
      evidenceConfidence: confidence,
      evidenceBand: band,
      evidenceFound: evidence.map((item) => item.text).slice(0, 4),
      evidenceType: match.lens,
      questionNeeded,
      questionPriority: questionPriority(match, requirement, confidence, structural),
      reason: confidenceReason(match, requirement, confidence, structural, transferableEligible)
    };
  });
}

export function semanticScoreFloorFromConfidence(args: {
  requirementConfidence: RequirementConfidence[];
  evidenceCount: number;
}): number {
  if (args.evidenceCount === 0) return 0;
  const highValueClarifications = args.requirementConfidence.filter(
    (item) =>
      item.questionNeeded &&
      item.evidenceConfidence >= 0.2 &&
      item.questionPriority >= 70
  ).length;
  if (highValueClarifications >= 3) return 45;
  if (highValueClarifications >= 1) return 35;
  return 0;
}

function evidenceConfidence(
  match: MatchEvaluation,
  requirement: JobRequirement | undefined,
  evidence: ResumeEvidence[],
  transferableEligible: boolean
): number {
  const directMetaAdsRequirement =
    Boolean(requirement && hasMetaAdsPlatformSignal(requirement.text)) ||
    hasMetaAdsPlatformSignal(match.requirementText);

  if (directMetaAdsRequirement) {
    const hasDirectMetaAdsEvidence = evidence.some(
      (item) =>
        hasMetaAdsPlatformSignal(item.text) ||
        item.toolsNamed.some((tool) => hasMetaAdsPlatformSignal(tool))
    );
    if (!hasDirectMetaAdsEvidence) {
      return transferableEligible ? 0.3 : match.classification === "MISSING" ? 0.05 : 0.25;
    }
  }

  if (isCrmDocumentationRequirement(requirement?.text ?? match.requirementText)) {
    const hasDirectCrmEvidence = evidence.some((item) =>
      isCrmDocumentationEvidence(`${item.text} ${item.toolsNamed.join(" ")}`)
    );
    if (!hasDirectCrmEvidence) {
      return transferableEligible ? 0.35 : match.classification === "MISSING" ? 0.05 : 0.25;
    }
  }

  switch (match.classification) {
    case "MATCH":
      return match.lens === "DIRECT" ? 0.92 : 0.84;
    case "PARTIAL":
      return 0.6;
    case "CLARIFY":
      return 0.35;
    case "MISSING":
      return transferableEligible ? 0.25 : 0.05;
    default:
      return 0;
  }
}

function evidenceBand(confidence: number): RequirementEvidenceBand {
  if (confidence >= 0.8) return "strong";
  if (confidence >= 0.5) return "moderate";
  if (confidence >= 0.2) return "weak";
  return "absent";
}

function questionPriority(
  match: MatchEvaluation,
  requirement: JobRequirement | undefined,
  confidence: number,
  structural: boolean
): number {
  if (structural) return 10;
  const hardRequirement =
    requirement?.intent === "MUST_HAVE" ||
    requirement?.kind === "TOOL" ||
    requirement?.kind === "CERTIFICATION" ||
    requirement?.kind === "EDUCATION" ||
    requirement?.kind === "EXPERIENCE_YEARS";
  if (hardRequirement && confidence < 0.65) return 100;
  if (match.requirementImportance === "HIGH" && confidence < 0.65) return 90;
  if (match.requirementImportance === "MEDIUM" && confidence < 0.65) return 70;
  if (confidence < 0.8) return 40;
  return 0;
}

function confidenceReason(
  match: MatchEvaluation,
  requirement: JobRequirement | undefined,
  confidence: number,
  structural: boolean,
  transferableEligible: boolean
): string {
  if (structural) {
    return "Tracked as ATS structure health, not semantic job fit.";
  }
  if (
    (requirement && hasMetaAdsPlatformSignal(requirement.text)) ||
    hasMetaAdsPlatformSignal(match.requirementText)
  ) {
    return confidence >= 0.8
      ? "Resume shows direct Meta or Facebook advertising platform evidence."
      : "Resume has adjacent social media or marketing evidence, but does not clearly prove Facebook Ads Manager, Meta Ads Manager, Meta Business Suite, or paid social campaign management.";
  }
  if (isCrmDocumentationRequirement(requirement?.text ?? match.requirementText)) {
    return confidence >= 0.8
      ? "Resume shows direct CRM, records, pipeline, tracker, or documentation-system evidence."
      : "Resume has adjacent client communication or operations evidence, but does not clearly prove CRM records, client notes, follow-up trackers, pipeline updates, or internal documentation systems.";
  }
  if (transferableEligible && confidence < 0.65) {
    return "Resume has adjacent transferable evidence, so this should be clarified rather than silently treated as absent.";
  }
  if (confidence >= 0.8) return "Resume provides clear evidence for this requirement.";
  if (confidence >= 0.5) return "Resume provides partial or transferable evidence.";
  if (confidence >= 0.2) return "Evidence is weak and would benefit from clarification.";
  return "No clear resume evidence was detected.";
}

function isCrmDocumentationRequirement(text: string): boolean {
  return /\bcrm|client notes|internal systems|documentation|records?|pipeline|follow-up|follow up\b/i.test(text) &&
    /\bcrm|internal systems|documentation|records?|notes?|pipeline|follow-up|follow up\b/i.test(text);
}

function isCrmDocumentationEvidence(text: string): boolean {
  return /\bcrm|client notes|internal systems|documentation system|records?|pipeline|follow-up tracker|follow up tracker|spreadsheet tracker|tracker|hubspot|salesforce\b/i.test(text);
}

type ResumeSignal = {
  marketing: boolean;
  socialMedia: boolean;
  clientCommunication: boolean;
  analytics: boolean;
  workflow: boolean;
  content: boolean;
};

function buildResumeSignal(evidence: ResumeEvidence[]): ResumeSignal {
  const text = evidence
    .map((item) => `${item.text} ${item.skillClusters.join(" ")} ${item.toolsNamed.join(" ")}`)
    .join("\n")
    .toLowerCase();
  return {
    marketing: /\b(marketing|campaign|brand|content strategy|digital|audience|engagement)\b/.test(text),
    socialMedia: /\b(social media|instagram|facebook|linkedin|youtube|meta|paid social|content campaign)\b/.test(text),
    clientCommunication: /\b(client|customer|account|stakeholder|communication|follow-up|follow up|onboarding|support|training|presentation)\b/.test(text),
    analytics: /\b(analytics|metric|performance|kpi|report|dashboard|tracking|insight|engagement)\b/.test(text),
    workflow: /\b(workflow|process|operations|coordination|documentation|records|follow-up|follow up|tracker|pipeline)\b/.test(text),
    content: /\b(content|copy|email|newsletter|faq|documentation|communications?|campaign)\b/.test(text)
  };
}

function transferableEvidenceEligible(
  requirement: JobRequirement,
  resumeSignal: ResumeSignal
): boolean {
  const text = requirement.text.toLowerCase();

  if (hasMetaAdsPlatformSignal(text)) {
    return resumeSignal.socialMedia || resumeSignal.marketing || resumeSignal.analytics;
  }
  if (/\b(crm|client notes|internal systems|documentation|records|pipeline|follow-up|follow up)\b/.test(text)) {
    return resumeSignal.clientCommunication || resumeSignal.workflow;
  }
  if (/\b(kpi|dashboard|campaign performance|client progress|performance tracking|analytics|reporting|metrics?)\b/.test(text)) {
    return resumeSignal.analytics || resumeSignal.marketing;
  }
  if (/\b(onboard|train|client|customer|follow-up|follow up|check-ins?|communication)\b/.test(text)) {
    return resumeSignal.clientCommunication || resumeSignal.content || resumeSignal.workflow;
  }
  if (/\b(campaign|content|social|marketing|audience|engagement)\b/.test(text)) {
    return resumeSignal.marketing || resumeSignal.socialMedia || resumeSignal.content;
  }
  return false;
}
