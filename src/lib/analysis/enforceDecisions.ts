// Decision Enforcement Layer (handoff Â§12).
//
// The LLM is the first pass; this module is the gate. We rewrite the
// LLM's classifications when a deterministic check tells us the model
// reached the wrong conclusion. The job is to prevent two specific
// failure modes from the previous version:
//
//   1. False MISSING when the resume has clear transferable evidence.
//      ("2-3 years client-facing" marked MISSING despite 10y customer
//      service experience.)
//
//   2. MISSING for a TOOL when the resume shows comparable category
//      experience without naming the specific tool. The right call is
//      CLARIFY, not MISSING.
//
// Inputs: the full set of requirements, evidence, and matches. Outputs:
// a new MatchEvaluation[] with classifications adjusted and reasoning
// rewritten where we intervened. We never DOWNGRADE a MATCH â€” only the
// LLM can decide something is a strong match in the first place.

import type {
  JobRequirement,
  MatchEvaluation,
  ResumeEvidence
} from "../types";
import type { ClusterId } from "../knowledge/skillClusters";
import { rulesFor } from "../knowledge/transferableMappings";
import {
  findToolCategory,
  siblingTools,
  clarifyToolQuestion
} from "../knowledge/toolMappings";
import { yearsInClusters, clustersIn } from "../utils/evidence";
import { satisfiesYears } from "../utils/dates";
import { containsTerm } from "../utils/normalizeText";
import { hasMetaAdsPlatformSignal } from "./platformSynonyms";
import {
  directQuestionForRequirement,
  isHardRequirement,
  isTradeRequirementText
} from "./fitAssessment";

const EQUIVALENT_EXPERIENCE_CLUSTERS: ClusterId[] = [
  "CLIENT_FACING",
  "ACCOUNT_GROWTH",
  "SALES_ENABLEMENT",
  "PROJECT_MANAGEMENT",
  "OPERATIONS",
  "PEOPLE_LEADERSHIP",
  "DATA_ANALYSIS",
  "WRITING_COMMUNICATION",
  "TECHNICAL_SUPPORT"
];

export interface EnforceResult {
  matches: MatchEvaluation[];
  // Diagnostic â€” which requirement IDs we touched and why. Not surfaced
  // in the UI; useful for debug logging.
  interventions: { requirementId: string; reason: string }[];
}

export function enforceDecisions(args: {
  requirements: JobRequirement[];
  evidence: ResumeEvidence[];
  matches: MatchEvaluation[];
}): EnforceResult {
  const reqsById = new Map(args.requirements.map((r) => [r.id, r]));
  const evById = new Map(args.evidence.map((e) => [e.id, e]));
  const allEvidenceClusters = clustersIn(args.evidence);
  const interventions: { requirementId: string; reason: string }[] = [];

  const out: MatchEvaluation[] = args.matches.map((m) => {
    const req = reqsById.get(m.requirementId);
    if (!req) return m;

    // Depth gate: broad social media wording is not enough to prove a hard
    // Facebook/Meta advertising platform requirement. Ask before generation
    // unless the resume clearly names Meta/Facebook ads, Business Suite, paid
    // social campaign management, ad spend, or equivalent platform evidence.
    if (
      m.classification === "MATCH" &&
      hasMetaAdsPlatformSignal(req.text) &&
      !hasVisibleMetaAdsEvidence(args.evidence, m.evidenceIds)
    ) {
      interventions.push({
        requirementId: req.id,
        reason: "META_ADS depth downgrade: broad social evidence is not direct ads platform evidence"
      });
      return {
        ...m,
        classification: "CLARIFY",
        confidence: "MEDIUM",
        lens: "NONE",
        evidenceIds: [],
        reasoning:
          "The resume may mention social media, but it does not clearly prove Facebook Ads Manager, Meta Ads Manager, Meta Business Suite, paid social campaign management, ad spend, or equivalent platform evidence.",
        clarificationQuestion: directQuestionForRequirement(req)
      };
    }

    // Never intervene on other MATCH rows â€” the LLM is allowed to say
    // something is proven; we only fix overly harsh classifications.
    if (m.classification === "MATCH") return m;

    // Language requirements are their own category. Do not let broad
    // communication/writing clusters turn "French language proficiency" into
    // a stakeholder-writing question.
    if (isLanguageRequirement(req.text)) {
      interventions.push({
        requirementId: req.id,
        reason: "LANGUAGE clarification: direct language question"
      });
      return {
        ...m,
        classification: req.intent === "PREFERRED" ? "PARTIAL" : "CLARIFY",
        confidence: m.confidence === "LOW" ? "MEDIUM" : m.confidence,
        lens: "SEMANTIC",
        reasoning:
          req.intent === "PREFERRED"
            ? "This is an optional language asset. It should only be included if the candidate actually has it."
            : "This language requirement needs direct confirmation if it is not clearly stated on the resume.",
        clarificationQuestion: languageQuestion(req.text)
      };
    }

    // Hard trade/license requirements must stay honest. Do not let general
    // operations, client service, or project-management evidence stand in for
    // a required trade credential, license, apprenticeship, code knowledge, or
    // hands-on installation/repair experience.
    if (isHardRequirement(req) && isTradeRequirementText(req.text)) {
      const tradeEvidence = args.evidence.filter((e) =>
        isTradeRequirementText(e.text)
      );
      if (tradeEvidence.length === 0) {
        interventions.push({
          requirementId: req.id,
          reason: "HARD_TRADE no direct trade evidence"
        });
        return {
          ...m,
          classification:
            req.kind === "CERTIFICATION" || /license|licence|certification|credential/i.test(req.text)
              ? "CLARIFY"
              : "MISSING",
          confidence: "MEDIUM",
          lens: "NONE",
          evidenceIds: [],
          reasoning:
            "This appears to be a hard trade requirement, and the resume does not show direct trade, license, apprenticeship, code, installation, repair, or maintenance evidence.",
          clarificationQuestion: directQuestionForRequirement(req)
        };
      }
    }

    // Rule 0: visible resume evidence gate.
    // Fresh analysis of a generated resume has no hidden answer memory, so
    // deterministically recognize common generated evidence patterns before
    // question generation gets a chance to re-ask solved gaps.
    const visibleCoverage = visibleEvidenceCoverageForRequirement(req, args.evidence);
    if (visibleCoverage) {
      interventions.push({
        requirementId: req.id,
        reason: `VISIBLE_EVIDENCE ${visibleCoverage.classification}: ${visibleCoverage.reason}`
      });
      return {
        ...m,
        classification: visibleCoverage.classification,
        confidence: visibleCoverage.classification === "MATCH" ? "MEDIUM" : m.confidence,
        lens: visibleCoverage.lens,
        evidenceIds: visibleCoverage.evidenceIds,
        reasoning: visibleCoverage.reason,
        clarificationQuestion: visibleCoverage.classification === "MATCH" ? undefined : m.clarificationQuestion
      };
    }
    // Rule 1: experience-year gate (handoff Â§13).
    // If the requirement is EXPERIENCE_YEARS and the candidate's
    // aggregated years in the relevant clusters meet the floor, lift
    // MISSING/PARTIAL/CLARIFY â†’ MATCH.
    if (
      req.kind === "EXPERIENCE_YEARS" &&
      req.yearsRequired &&
      req.skillClusters.length > 0
    ) {
      const candidateYears = yearsInClusters(args.evidence, req.skillClusters);
      if (satisfiesYears(candidateYears, req.yearsRequired)) {
        {
          interventions.push({
            requirementId: req.id,
            reason: `EXPERIENCE_YEARS upgrade: ~${candidateYears}y meets floor`
          });
          return {
            ...m,
            classification: "MATCH",
            confidence: m.confidence === "LOW" ? "MEDIUM" : m.confidence,
            lens: "EXPERIENCE_YEARS",
            reasoning: `Resume aggregates approximately ${candidateYears} years across the ${req.skillClusters.join(
              " / "
            )} cluster(s) â€” meets the ${formatYears(req.yearsRequired)} requirement.`,
            clarificationQuestion: undefined
          };
        }
      }
    }

    // Rule 2: cluster-transfer gate (handoff Â§14).
    // If the requirement names a JD cluster, and the resume has evidence
    // in any of that cluster's accepted resume-side clusters, then
    // MISSING is wrong. Default minimum: PARTIAL with a clarifying
    // question. STRONG transfers earn MATCH.
    if (
      m.classification === "MISSING" &&
      req.skillClusters.length > 0
    ) {
      for (const jdCluster of req.skillClusters) {
        const rules = rulesFor(jdCluster);
        for (const rule of rules) {
          const intersect = rule.resumeClustersAccepted.filter((c) =>
            allEvidenceClusters.has(c)
          );
          if (intersect.length === 0) continue;

          const upgraded: MatchEvaluation =
            rule.strength === "STRONG"
              ? {
                  ...m,
                  classification: "MATCH",
                  confidence: "MEDIUM",
                  lens: "CLUSTER_TRANSFER",
                  reasoning: `Resume shows ${intersect.join(
                    ", "
                  )} experience, which transfers to ${jdCluster} (${rule.rationale}).`,
                  clarificationQuestion: undefined
                }
              : {
                  ...m,
                  classification: "PARTIAL",
                  confidence: "MEDIUM",
                  lens: "CLUSTER_TRANSFER",
                  reasoning: `Resume shows ${intersect.join(
                    ", "
                  )} experience, which is adjacent to ${jdCluster} (${rule.rationale}).`,
                  clarificationQuestion:
                    m.clarificationQuestion ??
                    `Have you done work where you ${describe(
                      jdCluster
                    )}? What did you do, and what changed because of it?`
                };

          interventions.push({
            requirementId: req.id,
            reason: `CLUSTER_TRANSFER ${rule.strength}: ${intersect.join(
              "+"
            )} â†’ ${jdCluster}`
          });
          return upgraded;
        }
      }
    }

    // Rule 3: TOOL gate â€” never let MISSING stand on a tool the resume
    // doesn't name when category-level evidence exists.
    if (
      m.classification === "MISSING" &&
      (req.kind === "TOOL" || findToolCategoryFromReq(req))
    ) {
      const cat = findToolCategoryFromReq(req);
      if (cat) {
        const sibs = siblingTools(cat.id);
        // Did the resume name any sibling tool in the same category?
        const candidateUsedSibling = args.evidence.some((e) =>
          e.toolsNamed.some((tool) =>
            sibs.some((sib) => containsTerm(tool, sib))
          )
        );
        const upgraded: MatchEvaluation = candidateUsedSibling
          ? {
              ...m,
              classification: "PARTIAL",
              confidence: "MEDIUM",
              lens: "TOOL_CATEGORY",
              reasoning: `Resume shows experience with another ${cat.label} tool, which is comparable.`,
              clarificationQuestion:
                m.clarificationQuestion ?? clarifyToolQuestion(cat.id)
            }
          : {
              ...m,
              classification: "CLARIFY",
              confidence: "MEDIUM",
              lens: "TOOL_CATEGORY",
              reasoning: `JD asks for a specific ${cat.label} tool; resume doesn't name one. Likely transferable â€” confirming with a question.`,
              clarificationQuestion:
                m.clarificationQuestion ?? clarifyToolQuestion(cat.id)
            };
        interventions.push({
          requirementId: req.id,
          reason: `TOOL_CATEGORY upgrade: ${cat.id} (sibling=${candidateUsedSibling})`
        });
        return upgraded;
      }
    }

    // Rule 4: EDUCATION / related-field gate.
    // Requirements phrased as "related field OR equivalent professional
    // experience" must evaluate both sides. The fallback MISSING/NONE should
    // not survive when the resume has education evidence or relevant
    // professional cluster evidence.
    if (
      m.classification === "MISSING" &&
      req.kind === "EDUCATION" &&
      isRelatedFieldOrEquivalentRequirement(req.text)
    ) {
      const educationEvidence = args.evidence.filter((e) =>
        e.source.section === "EDUCATION" || isEducationEvidenceText(e.text)
      );
      const professionalEvidence = args.evidence.filter((e) =>
        e.skillClusters.some((cluster) =>
          EQUIVALENT_EXPERIENCE_CLUSTERS.includes(cluster)
        )
      );

      if (educationEvidence.length > 0 && professionalEvidence.length > 0) {
        interventions.push({
          requirementId: req.id,
          reason:
            "EDUCATION_EQUIVALENT upgrade: education plus professional experience"
        });
        return {
          ...m,
          classification: "MATCH",
          confidence: "MEDIUM",
          lens: "SEMANTIC",
          evidenceIds: evidenceIdsFor([
            ...educationEvidence,
            ...professionalEvidence
          ]),
          reasoning:
            "Resume shows post-secondary education and relevant professional experience, satisfying the related-field-or-equivalent requirement.",
          clarificationQuestion: undefined
        };
      }

      if (educationEvidence.length > 0 || professionalEvidence.length > 0) {
        interventions.push({
          requirementId: req.id,
          reason:
            educationEvidence.length > 0
              ? "EDUCATION_EQUIVALENT partial: education evidence"
              : "EDUCATION_EQUIVALENT partial: professional-equivalent evidence"
        });
        return {
          ...m,
          classification: "PARTIAL",
          confidence: "MEDIUM",
          lens: "SEMANTIC",
          evidenceIds: evidenceIdsFor(
            educationEvidence.length > 0
              ? educationEvidence
              : professionalEvidence
          ),
          reasoning:
            educationEvidence.length > 0
              ? "Resume shows post-secondary education; relatedness to this role may need clearer positioning."
              : "Resume shows relevant professional experience that may satisfy the equivalent-experience side of this requirement.",
          clarificationQuestion:
            m.clarificationQuestion ??
            "Can you briefly confirm the education, training, or equivalent professional experience we should use for this role?"
        };
      }
    }

    // Rule 5: license / travel hard-fact gate.
    // If a hard fact is not stated, ask for confirmation instead of treating
    // it as proven absent.
    if (
      m.classification === "MISSING" &&
      isLicenseOrTravelRequirement(req.text)
    ) {
      interventions.push({
        requirementId: req.id,
        reason: "HARD_FACT clarification: license/travel"
      });
      return {
        ...m,
        classification: "CLARIFY",
        confidence: "MEDIUM",
        lens: "SEMANTIC",
        reasoning:
          "This is a hard fact the resume does not clearly state; it should be confirmed rather than treated as absent.",
        clarificationQuestion:
          m.clarificationQuestion ??
          directQuestionForRequirement(req)
      };
    }

    // Rule 6: RESPONSIBILITY / TRANSFERABLE intent should never be
    // MISSING when the resume has any evidence in the relevant cluster
    // or any text at all. Floor: PARTIAL.
    if (
      m.classification === "MISSING" &&
      (req.intent === "RESPONSIBILITY" || req.intent === "TRANSFERABLE")
    ) {
      const intersect = req.skillClusters.filter((c) =>
        allEvidenceClusters.has(c)
      );
      if (intersect.length > 0 || args.evidence.length > 0) {
        interventions.push({
          requirementId: req.id,
          reason: `INTENT floor: ${req.intent} can't be MISSING with related evidence`
        });
        return {
          ...m,
          classification: "PARTIAL",
          confidence: "LOW",
          lens: intersect.length ? "CLUSTER_TRANSFER" : "SEMANTIC",
          reasoning: `This is a ${req.intent.toLowerCase()} item, not a hard prerequisite. The candidate's experience supports the duty even if the resume doesn't say it directly.`,
          clarificationQuestion:
            m.clarificationQuestion ??
            directQuestionForRequirement(req)
        };
      }
    }

    return m;
  });

  return { matches: out, interventions };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


type VisibleCoverage = {
  classification: "MATCH" | "PARTIAL";
  lens: MatchEvaluation["lens"];
  evidenceIds: string[];
  reason: string;
};

function visibleEvidenceCoverageForRequirement(
  req: JobRequirement,
  evidence: ResumeEvidence[]
): VisibleCoverage | null {
  const reqText = req.text.toLowerCase();
  const allYears = totalVisibleExperienceYears(evidence);

  if (hasMetaAdsPlatformSignal(reqText)) {
    const hits = evidence.filter((e) => hasMetaAdsPlatformSignal(e.text) || e.toolsNamed.some(hasMetaAdsPlatformSignal));
    if (hits.length > 0) {
      return {
        classification: "MATCH",
        lens: "SEMANTIC",
        evidenceIds: evidenceIdsFor(hits),
        reason:
          "Resume shows Meta or Facebook advertising platform evidence, satisfying the Facebook Ads Manager requirement."
      };
    }
  }

  if (isGenericExperienceYearsRequirement(req)) {
    if (allYears > 0 && satisfiesYears(allYears, req.yearsRequired)) {
      return {
        classification: "MATCH",
        lens: "EXPERIENCE_YEARS",
        evidenceIds: evidenceIdsFor(evidenceWithYears(evidence)),
        reason: `Resume shows dated role history totaling approximately ${allYears} years, satisfying the stated experience range.`
      };
    }
    if (allYears > 0) {
      return {
        classification: "PARTIAL",
        lens: "EXPERIENCE_YEARS",
        evidenceIds: evidenceIdsFor(evidenceWithYears(evidence)),
        reason: `Resume shows dated role history totaling approximately ${allYears} years; relevance to this experience requirement may need clearer positioning.`
      };
    }
  }

  if (isTemplatedCommunicationRequirement(reqText)) {
    const hits = evidence.filter((e) => isTemplatedCommunicationEvidence(e.text));
    if (hits.length > 0) {
      return {
        classification: "MATCH",
        lens: "SEMANTIC",
        evidenceIds: evidenceIdsFor(hits),
        reason:
          "Resume includes standardized, customer-facing, or email communication evidence with accuracy, consistency, brand, onboarding, FAQ, or newsletter context."
      };
    }
  }

  if (isClientLifecycleCommunicationRequirement(reqText)) {
    const hits = evidence.filter((e) =>
      e.skillClusters.some((cluster) =>
        ["CLIENT_FACING", "ACCOUNT_GROWTH", "CRM_PIPELINE", "WRITING_COMMUNICATION"].includes(cluster)
      ) || isClientLifecycleCommunicationEvidence(e.text)
    );
    if (hits.length > 0) {
      return {
        classification: "MATCH",
        lens: "SEMANTIC",
        evidenceIds: evidenceIdsFor(hits),
        reason:
          "Resume shows client, customer, account, lifecycle, follow-up, or customer-facing communication evidence for this requirement."
      };
    }
  }

  if (isEducationOrEquivalentRequirement(reqText)) {
    const educationEvidence = evidence.filter((e) =>
      e.source.section === "EDUCATION" || isEducationEvidenceText(e.text)
    );
    const professionalEvidence = evidence.filter((e) =>
      e.skillClusters.some((cluster) => EQUIVALENT_EXPERIENCE_CLUSTERS.includes(cluster))
    );
    if (educationEvidence.length > 0 || professionalEvidence.length > 0) {
      return {
        classification: educationEvidence.length > 0 && professionalEvidence.length > 0 ? "MATCH" : "PARTIAL",
        lens: "SEMANTIC",
        evidenceIds: evidenceIdsFor([...educationEvidence, ...professionalEvidence]),
        reason:
          educationEvidence.length > 0 && professionalEvidence.length > 0
            ? "Resume shows education evidence and relevant professional experience for the education-or-equivalent requirement."
            : "Resume shows either education evidence or relevant professional experience for the education-or-equivalent requirement."
      };
    }
  }

  const directHits = evidence.filter((e) => sharedSignalCount(req.text, e.text) >= 2);
  if (directHits.length > 0 && req.importance !== "LOW") {
    return {
      classification: "PARTIAL",
      lens: "SEMANTIC",
      evidenceIds: evidenceIdsFor(directHits),
      reason: "Resume contains direct language that overlaps with this requirement; it should not be treated as missing."
    };
  }

  return null;
}

function isGenericExperienceYearsRequirement(req: JobRequirement): boolean {
  const text = req.text.toLowerCase();
  return (
    req.kind === "EXPERIENCE_YEARS" &&
    /\b(experience|entry[-\s]?level|0\s*[-–—to]+\s*2|1\s*[-–—to]+\s*2|2\+?\s*years?)\b/.test(text)
  );
}

function totalVisibleExperienceYears(evidence: ResumeEvidence[]): number {
  const years = evidenceWithYears(evidence).map((e) => e.dateRange?.approximateYears ?? 0);
  return Math.min(50, years.reduce((sum, value) => sum + value, 0));
}

function evidenceWithYears(evidence: ResumeEvidence[]): ResumeEvidence[] {
  return evidence.filter((e) => (e.dateRange?.approximateYears ?? 0) > 0);
}

function isTemplatedCommunicationRequirement(text: string): boolean {
  return /\b(template|templated|email communication|standardized|accuracy|consistency|brand|compliance|newsletter|faq|member communication)\b/i.test(text);
}

function isTemplatedCommunicationEvidence(text: string): boolean {
  const lowered = text.toLowerCase();
  const communication = /\b(email|newsletter|faq|template|communication|customer-facing|member-facing|onboarding|drip campaign|campaign)\b/.test(lowered);
  const quality = /\b(accuracy|consistent|consistency|brand|compliance|reviewed|standardized|clarity|reduced repeated|fewer support questions)\b/.test(lowered);
  return communication && quality;
}

function isClientLifecycleCommunicationRequirement(text: string): boolean {
  return /\b(client|customer|member|account|lifecycle|onboarding|follow-up|follow up|relationship|communication|retention|support)\b/i.test(text);
}

function isClientLifecycleCommunicationEvidence(text: string): boolean {
  return /\b(client|customer|member|account|lifecycle|onboarding|follow-up|follow up|relationship|communication|stakeholder|support|retention|customer-facing)\b/i.test(text);
}

function isEducationOrEquivalentRequirement(text: string): boolean {
  return /\b(post-secondary|post secondary|degree|diploma|education|related field|equivalent professional experience|equivalent experience|or equivalent)\b/i.test(text);
}

function sharedSignalCount(requirementText: string, evidenceText: string): number {
  const stop = new Set([
    "this", "that", "with", "from", "your", "have", "used", "using", "role", "work", "what", "when", "where", "which", "should", "could", "would", "years", "experience", "ability", "skills", "required", "considered", "asset"
  ]);
  const reqWords = requirementText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !stop.has(word));
  const evidenceLower = evidenceText.toLowerCase();
  return [...new Set(reqWords)].filter((word) => evidenceLower.includes(word)).length;
}
function formatYears(req: { min?: number; max?: number }): string {
  if (req.min !== undefined && req.max !== undefined) {
    if (req.min === req.max) return `${req.min} years`;
    return `${req.min}-${req.max} years`;
  }
  if (req.min !== undefined) return `${req.min}+ years`;
  if (req.max !== undefined) return `up to ${req.max} years`;
  return "the stated";
}

function describe(cluster: string): string {
  // Loose mapping for question phrasing â€” keeps clarification questions
  // human even when the cluster name is technical.
  const map: Record<string, string> = {
    CLIENT_FACING: "managed direct customer or client relationships",
    ACCOUNT_GROWTH: "grew accounts, retained customers, or drove renewals",
    SALES_ENABLEMENT: "supported a sales team or built sales materials",
    PROJECT_MANAGEMENT: "owned a project end-to-end or coordinated cross-functionally",
    PROFITABILITY: "drove revenue, margin, or cost savings",
    CRM_PIPELINE: "managed a pipeline in a CRM",
    OPERATIONS: "ran day-to-day operations or workflow",
    PEOPLE_LEADERSHIP: "led, mentored, or trained others",
    DATA_ANALYSIS: "analyzed data to inform decisions",
    WRITING_COMMUNICATION: "wrote customer-facing or stakeholder content",
    TECHNICAL_SUPPORT: "resolved technical issues for users or customers"
  };
  return map[cluster] ?? "did something similar";
}

function isRelatedFieldOrEquivalentRequirement(text: string): boolean {
  const educationSignal =
    /\b(post-secondary|post secondary|degree|diploma|education|related field)\b/i.test(
      text
    );
  const equivalentSignal =
    /\b(equivalent professional experience|equivalent experience|or equivalent)\b/i.test(
      text
    );
  return educationSignal && equivalentSignal;
}

function isEducationEvidenceText(text: string): boolean {
  return /\b(degree|diploma|certificate|college|university|post-secondary|post secondary|journalism|multimedia|communications?|media|marketing)\b/i.test(
    text
  );
}

function isLicenseOrTravelRequirement(text: string): boolean {
  return /\b(driver'?s license|driving licence|valid license|valid licence|willingness to travel|able to travel|travel as required)\b/i.test(
    text
  );
}

function isLanguageRequirement(text: string): boolean {
  return /\b(french|english|bilingual|multilingual|language proficiency|fluen(?:t|cy)|verbal and written)\b/i.test(
    text
  );
}

function languageQuestion(text: string): string {
  if (/\bfrench\b/i.test(text)) {
    return "Do you have any French language proficiency we should mention?";
  }
  if (/\benglish\b/i.test(text)) {
    return "Do you have any formal English language credential or proficiency detail we should mention?";
  }
  return `Do you have language proficiency related to "${text}" that we should mention?`;
}

function evidenceIdsFor(evidence: ResumeEvidence[]): string[] {
  return [...new Set(evidence.map((e) => e.id))].slice(0, 6);
}

function hasVisibleMetaAdsEvidence(
  evidence: ResumeEvidence[],
  linkedEvidenceIds: string[]
): boolean {
  const linked = new Set(linkedEvidenceIds);
  const candidates = linked.size > 0
    ? evidence.filter((item) => linked.has(item.id))
    : evidence;
  return candidates.some(
    (item) =>
      hasMetaAdsPlatformSignal(item.text) ||
      item.toolsNamed.some((tool) => hasMetaAdsPlatformSignal(tool))
  );
}

function findToolCategoryFromReq(req: JobRequirement) {
  if (req.toolCategory) {
    const byExplicit = findToolCategory(req.toolCategory);
    if (byExplicit) return byExplicit;
  }
  // Fall back to scanning the requirement text.
  return findToolCategory(req.text);
}



