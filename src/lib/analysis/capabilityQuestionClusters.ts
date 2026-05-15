import type {
  AnalysisResult,
  Importance,
  JobRequirement,
  MatchEvaluation
} from "../types";
import { isHardRequirement, isTradeRequirementText } from "./fitAssessment";
import {
  getQuestionSuppressionReason,
  isQuestionableJobAdText,
  validateQuestionForCandidate
} from "./jobAdItems";
import {
  interpretRequirementForQuestion,
  interpretTextForQuestion,
  keyForIntent,
  titleForIntent
} from "./requirementIntentInterpreter";

export type CapabilityQuestionCoverage = "missing" | "partial" | "transferable";

export type CapabilityQuestionCluster = {
  id: string;
  title: string;
  importance: "high" | "medium" | "low";
  coverage: CapabilityQuestionCoverage;
  relatedRequirementIds: string[];
  relatedRequirements: string[];
  internalReason: string;
  userFacingReason: string;
  question: string;
  jobAdReference: string;
  primaryMatch: MatchEvaluation;
};

type ClusterBlueprint = Omit<
  CapabilityQuestionCluster,
  "id" | "relatedRequirementIds" | "relatedRequirements" | "primaryMatch"
> & { key: string };

type ClusterDraft = Omit<
  CapabilityQuestionCluster,
  "relatedRequirementIds" | "relatedRequirements" | "primaryMatch"
> & {
  key: string;
  relatedRequirementIds: Set<string>;
  relatedRequirements: Set<string>;
  primaryMatch: MatchEvaluation;
};

const IMPORTANCE_RANK: Record<Importance, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

const COVERAGE_RANK: Record<CapabilityQuestionCoverage, number> = {
  missing: 3,
  partial: 2,
  transferable: 1
};

export function buildCapabilityQuestionClusters(
  analysis: AnalysisResult,
  matches: MatchEvaluation[],
  answeredMemory: string[] = []
): CapabilityQuestionCluster[] {
  const requirementsById = new Map(analysis.requirements.map((r) => [r.id, r]));
  const confidenceById = new Map(
    (analysis.requirementConfidence ?? []).map((item) => [item.requirementId, item])
  );
  const answered = new Set(answeredMemory.map(normalizeQuestion));
  const drafts = new Map<string, ClusterDraft>();
  const normalizedQuestionToKey = new Map<string, string>();

  for (const match of matches) {
    const requirement = requirementsById.get(match.requirementId);
    const confidence = confidenceById.get(match.requirementId);
    const forceAskFromConfidence =
      Boolean(confidence?.questionNeeded) || (confidence?.questionPriority ?? 0) >= 70;
    if (requirement && getQuestionSuppressionReason(requirement) && !forceAskFromConfidence) {
      continue;
    }
    if (!requirement && !isQuestionableJobAdText(match.requirementText) && !forceAskFromConfidence) {
      continue;
    }
    const blueprint = buildBlueprint(match, requirement, forceAskFromConfidence);
    if (!blueprint) {
      continue;
    }
    const qualityGate = validateQuestionForCandidate({
      question: blueprint.question,
      jobAdReference: blueprint.jobAdReference,
      requirement
    });
    if (!qualityGate.passed && !forceAskFromConfidence) {
      logQuestionSuppression(match.requirementText, blueprint.question, qualityGate.reason);
      continue;
    }
    const normalizedQuestion = normalizeQuestion(blueprint.question);
    if (
      answered.has(normalizeQuestion(blueprint.key)) ||
      answered.has(normalizedQuestion) ||
      answered.has(normalizeQuestion(blueprint.jobAdReference))
    ) {
      continue;
    }

    const existingKey = drafts.has(blueprint.key)
      ? blueprint.key
      : normalizedQuestionToKey.get(normalizedQuestion);
    const key = existingKey ?? blueprint.key;

    if (!drafts.has(key)) {
      drafts.set(key, {
        ...blueprint,
        id: key,
        key,
        relatedRequirementIds: new Set(),
        relatedRequirements: new Set(),
        primaryMatch: match
      });
      normalizedQuestionToKey.set(normalizedQuestion, key);
    }

    const draft = drafts.get(key)!;
    draft.relatedRequirementIds.add(match.requirementId);
    draft.relatedRequirements.add(match.requirementText);

    if (shouldReplacePrimary(match, draft.primaryMatch)) {
      draft.importance = importanceToUi(match.requirementImportance);
      draft.coverage = strongestCoverage(draft.coverage, coverageForMatch(match));
      draft.primaryMatch = match;
      draft.question = blueprint.question;
      draft.jobAdReference = blueprint.jobAdReference;
      draft.userFacingReason = blueprint.userFacingReason;
    } else {
      draft.coverage = strongestCoverage(draft.coverage, coverageForMatch(match));
      draft.jobAdReference = chooseReference(draft.jobAdReference, blueprint.jobAdReference);
    }
  }

  return [...drafts.values()]
    .map(({ key: _key, relatedRequirementIds, relatedRequirements, ...draft }) => ({
      ...draft,
      relatedRequirementIds: [...relatedRequirementIds],
      relatedRequirements: [...relatedRequirements]
    }))
    .sort((a, b) => {
      const priorityDelta = questionPriorityRank(b) - questionPriorityRank(a);
      if (priorityDelta !== 0) return priorityDelta;
      const importanceDelta = importanceRank(b.importance) - importanceRank(a.importance);
      if (importanceDelta !== 0) return importanceDelta;
      return COVERAGE_RANK[b.coverage] - COVERAGE_RANK[a.coverage];
    })
    .slice(0, 6);
}

function questionPriorityRank(cluster: Pick<CapabilityQuestionCluster, "id" | "question" | "jobAdReference">): number {
  const text = `${cluster.id} ${cluster.question} ${cluster.jobAdReference}`.toLowerCase();
  if (/\b(facebook ads manager|meta ads manager|meta business suite|facebook manager|paid social|salesforce|hubspot|excel|quickbooks|google analytics|sql|python|license|licence|certification|credential|bachelor|degree|years? of experience)\b/.test(text)) {
    return 7;
  }
  if (/\b(crm|dashboard|reporting|campaign performance|analytics|tool|platform)\b/.test(text)) return 6;
  if (/\b(client|customer|onboard|project|workflow|pipeline|communication)\b/.test(text)) return 5;
  if (/\b(organized|proactive|soft|observable-work-habits)\b/.test(text)) return 2;
  return 4;
}

function buildBlueprint(
  match: MatchEvaluation,
  requirement?: JobRequirement,
  forceAsk = false
): ClusterBlueprint | undefined {
  const requirementText = requirement?.text || match.requirementText;
  const interpreted = requirement
    ? interpretRequirementForQuestion(requirement)
    : interpretTextForQuestion(match.requirementText);
  if ((!interpreted.shouldAsk && !forceAsk) || !interpreted.questionText) return undefined;
  const key = keyForIntent(interpreted.inferredIntent, requirementText);

  return {
    key,
    title: titleForIntent(interpreted.inferredIntent, requirementText),
    importance: importanceToUi(match.requirementImportance),
    coverage: coverageForMatch(match),
    internalReason: `Grouped under ${key}; intent ${interpreted.inferredIntent}; evidence needed: ${interpreted.evidenceNeeded}.`,
    userFacingReason: interpreted.whyText,
    question: interpreted.questionText,
    jobAdReference: interpreted.jobAdQuote
  };
}

function capabilityKey(text: string, requirement?: JobRequirement): string {
  if (requirement && isHardRequirement(requirement)) {
    if (isTradeRequirementText(requirement.text)) return "trade-credential-or-experience";
    if (requirement.kind === "CERTIFICATION" || /\b(license|licence|certification|credential)\b/i.test(requirement.text)) {
      return "license-certification-credential";
    }
    if (requirement.kind === "EXPERIENCE_YEARS") return "required-experience-years";
  }
  if (/\b(email marketing|campaign|automation|list segmentation|performance tracking|crm|pipeline|outreach|lead|marketing automation|customer list|mailchimp|hubspot|salesforce|follow-up|follow up)\b/.test(text)) {
    return "crm-marketing-operations";
  }
  if (/\b(powerpoint|slide deck|deck|presentation|proposal|sales material|client presentation)\b/.test(text)) {
    return "presentations-sales-materials";
  }
  if (/\b(templated email|email communication|standardized written|brand|compliance|accuracy|consistency)\b/.test(text)) {
    return "templated-communications";
  }
  if (/\b(profit|profitability|margin|budget|cost|scope|pricing|revenue)\b/.test(text)) {
    return "budget-profitability-scope";
  }
  if (/\b(project|workflow|timeline|deadline|coordinate|coordination|multiple|vendor|installation|deliverable|schedule)\b/.test(text)) {
    return "project-workflow-coordination";
  }
  if (/\b(client|customer|account|relationship|business development|sales|retention|renewal|support|service)\b/.test(text)) {
    return "client-account-growth";
  }
  if (/\b(french|bilingual|language)\b/.test(text)) return "language-proficiency";
  if (/\b(writing|written|content|communication|report|reporting|stakeholder|documentation)\b/.test(text)) {
    return "communication-content-reporting";
  }
  if (requirement?.kind === "TOOL" || /\b(tool|software|platform|system|excel|spreadsheet|office|google workspace|microsoft)\b/.test(text)) {
    return "tools-systems";
  }
  if (requirement?.kind === "EDUCATION" || /\b(education|degree|diploma|college|university|post-secondary|post secondary)\b/.test(text)) {
    return "education-equivalent-experience";
  }
  return `requirement-${normalizeQuestion(text).slice(0, 48)}`;
}

function tailoredQuestionForRequirement(requirementText: string, key: string): string {
  const text = requirementText.toLowerCase();

  if (key === "trade-credential-or-experience") {
    if (/\b(plumbing license|plumber'?s license|licensed plumber|trade certificate|red seal|apprentice|apprenticeship|journeyperson|journeyman|certification|certified)\b/.test(text)) {
      return "Do you have plumbing trade experience, apprenticeship hours, or a plumbing license or certification?";
    }
    if (/\b(code|safety|regulation|permit|inspection)\b/.test(text)) {
      return "Are you familiar with the plumbing codes, safety requirements, permits, or inspection standards this role requires?";
    }
    return "Have you installed, repaired, or maintained plumbing systems in a professional setting? What kind of work did you do?";
  }
  if (key === "license-certification-credential") {
    return "Do you currently hold the required license, certification, or credential? If yes, where is it valid?";
  }
  if (key === "required-experience-years" || /\b\d{1,2}\s*(?:[-–—]|to|\+)\s*\d{0,2}\s*(?:years?|yrs?)\b|\bentry[-\s]?level\b/.test(text)) {
    return "How many years of directly relevant experience do you have, and which roles best show that experience?";
  }
  if (/\b(email marketing|campaign|automation|list segmentation|performance tracking)\b/.test(text)) {
    return "Have you planned or helped manage email campaigns, contact lists, follow-ups, automations, or performance tracking in any tool, even spreadsheets?";
  }
  if (/\b(crm|pipeline|lead|customer list|outreach|follow-up|follow up)\b/.test(text)) {
    return "Have you managed customer lists, leads, outreach, pipeline tracking, or follow-up processes in any system, including spreadsheets?";
  }
  if (/\b(powerpoint|slide deck|deck|presentation|proposal|sales material|client presentation)\b/.test(text)) {
    return "Have you used PowerPoint or slide decks to create client-facing presentations, proposals, reports, or sales materials?";
  }
  if (/\b(templated email|email communication|standardized written|brand|compliance|accuracy|consistency)\b/.test(text)) {
    return "Have you created or managed templated emails, client-facing communications, or other standardized written materials where accuracy, consistency, or brand alignment mattered?";
  }
  if (/\b(profit|profitability|margin|budget|cost|scope|pricing|revenue)\b/.test(text)) {
    return "Have you tracked budgets, costs, profitability, revenue, or scope for client or project work? How did you keep the work on target?";
  }
  if (/\b(project|workflow|timeline|deadline|coordinate|coordination|multiple|vendor|installation|deliverable|schedule)\b/.test(text)) {
    return "What kinds of projects, timelines, client requests, vendors, or moving pieces have you coordinated at the same time?";
  }
  if (/\b(client|customer|account|relationship|business development|sales|retention|renewal|support|service)\b/.test(text)) {
    return "Have you managed client relationships, accounts, follow-ups, renewals, sales conversations, or customer issues? What did you do to keep those relationships moving?";
  }
  if (/\b(french|bilingual|language)\b/.test(text)) {
    return "Do you have any French or other language proficiency we should include?";
  }
  if (/\b(writing|written|content|communication|report|reporting|stakeholder|documentation)\b/.test(text)) {
    return "Have you created customer-facing, stakeholder, reporting, proposal, or campaign content? What did you write or communicate, and for whom?";
  }
  if (/\b(tool|software|platform|system|excel|spreadsheet|office|google workspace|microsoft)\b/.test(text)) {
    if (/\bexcel\b/.test(text)) {
      return "How proficient are you with Excel, and what have you used it for professionally?";
    }
    return "How proficient are you with the tool or system mentioned in the posting, and what have you used it for professionally?";
  }
  if (/\b(education|degree|diploma|college|university|post-secondary|post secondary)\b/.test(text)) {
    return "Do you have the education, training, or equivalent professional experience requested for this role?";
  }
  if (key === "crm-marketing-operations") {
    return "Have you managed customer lists, leads, outreach, email campaigns, or follow-up processes in any system, including spreadsheets? What did you track, send, organize, or improve?";
  }
  return directEvidenceQuestion(requirementText);
}

function titleForKey(key: string, requirementText: string): string {
  const titles: Record<string, string> = {
    "crm-marketing-operations": "CRM, marketing operations, and campaign management",
    "presentations-sales-materials": "Client presentations and sales materials",
    "templated-communications": "Templated and client-facing communications",
    "budget-profitability-scope": "Budget, profitability, and scope management",
    "project-workflow-coordination": "Project and workflow coordination",
    "client-account-growth": "Client relationships and account growth",
    "language-proficiency": "Language proficiency",
    "communication-content-reporting": "Communication, content, and reporting",
    "tools-systems": "Tools and systems",
    "education-equivalent-experience": "Education or equivalent experience",
    "trade-credential-or-experience": "Trade credentials and hands-on experience",
    "license-certification-credential": "Required license, certification, or credential",
    "required-experience-years": "Required experience level"
  };
  return titles[key] ?? shortTitle(requirementText);
}

function reasonForKey(key: string): string {
  const reasons: Record<string, string> = {
    "crm-marketing-operations":
      "A direct example can help us translate your tracking, outreach, or campaign experience into the language this posting uses.",
    "presentations-sales-materials":
      "The posting points to presentation or sales material work. We only need an example if you have one.",
    "templated-communications":
      "The posting asks for careful, consistent communications. A concrete example can help us show that skill naturally.",
    "budget-profitability-scope":
      "A short example can help show how you handled budgets, costs, profitability, or scope.",
    "project-workflow-coordination":
      "A concrete example can help connect your coordination experience to project ownership and managing moving pieces.",
    "client-account-growth":
      "A concrete example can strengthen how your client, customer, sales, or account work is positioned.",
    "language-proficiency":
      "This is a language detail, so only mention it if it is true and useful for the role.",
    "communication-content-reporting":
      "One specific example can help position your writing, reporting, or stakeholder communication experience.",
    "tools-systems":
      "The posting names tools or systems. We need to know which ones you have actually used so the resume stays accurate.",
    "education-equivalent-experience":
      "The posting allows education or equivalent experience. We need the strongest relevant education or professional experience to use.",
    "trade-credential-or-experience":
      "The posting appears to require hands-on trade experience or credentials. Transferable office experience cannot replace this if it is required.",
    "license-certification-credential":
      "The posting asks for a hard credential. We need direct confirmation rather than inferred experience.",
    "required-experience-years":
      "The posting asks for a specific experience level. We need directly relevant experience, not unrelated background."
  };
  return reasons[key] ?? "A direct example can help us tailor this section more strongly.";
}

function shouldReplacePrimary(candidate: MatchEvaluation, current: MatchEvaluation): boolean {
  const importanceDelta = IMPORTANCE_RANK[candidate.requirementImportance] - IMPORTANCE_RANK[current.requirementImportance];
  if (importanceDelta !== 0) return importanceDelta > 0;
  return COVERAGE_RANK[coverageForMatch(candidate)] > COVERAGE_RANK[coverageForMatch(current)];
}

function chooseReference(current: string, next: string): string {
  if (!current) return next;
  if (!next) return current;
  if (next.length > current.length && next.length <= 180) return next;
  return current;
}

function strongestCoverage(
  current: CapabilityQuestionCoverage,
  next: CapabilityQuestionCoverage
): CapabilityQuestionCoverage {
  return COVERAGE_RANK[next] > COVERAGE_RANK[current] ? next : current;
}

function coverageForMatch(match: MatchEvaluation): CapabilityQuestionCoverage {
  if (match.classification === "MISSING") return "missing";
  if (match.classification === "PARTIAL") return "partial";
  return "transferable";
}

function importanceToUi(importance: Importance): "high" | "medium" | "low" {
  return importance.toLowerCase() as "high" | "medium" | "low";
}

function importanceRank(importance: Importance | "high" | "medium" | "low"): number {
  return IMPORTANCE_RANK[importance.toUpperCase() as Importance] ?? 0;
}

export function questionMemoryKeys(cluster: Pick<CapabilityQuestionCluster, "id" | "question" | "jobAdReference" | "relatedRequirements">): string[] {
  return [
    cluster.id,
    cluster.question,
    cluster.jobAdReference,
    ...cluster.relatedRequirements
  ].map(normalizeQuestion).filter(Boolean);
}

export function normalizeQuestionSignature(value: string): string {
  return normalizeQuestion(value);
}

function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortTitle(requirementText: string): string {
  const trimmed = requirementText.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

function directEvidenceQuestion(requirementText: string): string {
  const text = requirementText.toLowerCase();

  if (/\b(report|dashboard|analytics|data|metric|performance|insight)\b/.test(text)) {
    return "Have you used reporting, analytics, dashboards, or performance data to make recommendations or improve outcomes?";
  }
  if (/\b(stakeholder|cross-functional|cross functional|team|department|partner|vendor)\b/.test(text)) {
    return "Have you coordinated projects, timelines, deliverables, or stakeholders across teams? What were you responsible for?";
  }
  if (/\b(customer|client|member|onboarding|support|documentation|communication)\b/.test(text)) {
    return "Have you created customer-facing communications, onboarding content, support documentation, reports, or stakeholder updates?";
  }
  if (/\b(manage|coordinate|develop|maintain|create|build|analyze|support|lead|execute|track|review|implement|deliver)\b/.test(text)) {
    return "Have you handled comparable work in a professional setting? What did you do, what was the context, and what changed or improved because of it?";
  }
  return "Have you managed projects, workflows, customers, tools, reports, or documentation that relate to this role? What did you own and what improved?";
}

function logQuestionSuppression(
  requirementText: string,
  question: string,
  reason?: string
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[question-quality-gate]", {
    requirementText,
    generatedQuestion: question,
    qualityGatePassed: false,
    suppressionReason: reason ?? "Question failed quality gate."
  });
}
