import {
  buildRecruiterConcernNotes,
  inferTransferableSkillSignals,
  inferTransitionRecommendations,
  type TransferableSkillSignal
} from "@/lib/careerIntelligence";

export type ExplicitSkill = {
  skill: string;
  evidence: string;
};

export type ImplicitSkill = {
  skill: string;
  evidence: string;
  whyRecruitersCare: string;
  confidence: TransferableSkillSignal["confidence"];
};

export type ProfessionalFunction = {
  functionName: string;
  evidence: string;
  recruiterLanguage: string;
};

export type TransferableSkillExtraction = {
  explicitSkills: ExplicitSkill[];
  implicitSkills: ImplicitSkill[];
  transferableSkills: string[];
  professionalFunctions: ProfessionalFunction[];
  adjacentCareers: string[];
  recruiterConcerns: string[];
  evidenceNotes: string[];
};

const EXPLICIT_SKILL_PATTERNS: Array<{ skill: string; pattern: RegExp; evidence: string }> = [
  { skill: "Cooking and food preparation", pattern: /\b(cook|cooking|prep|food preparation|menu|kitchen)\b/i, evidence: "User references kitchen, food preparation, or cooking work." },
  { skill: "Customer service", pattern: /\b(customer service|customers?|guest|client|support|front desk)\b/i, evidence: "User references direct service, guest, customer, client, or support work." },
  { skill: "Sales", pattern: /\b(sales|selling|revenue|cashier|merchandising)\b/i, evidence: "User references sales, retail, cashier, revenue, or merchandising work." },
  { skill: "Writing", pattern: /\b(write|writing|journalism|editor|copy|content|newsletter)\b/i, evidence: "User references writing, editing, content, or journalism work." },
  { skill: "Training", pattern: /\b(train|training|mentor|coach|onboard|teach|tutor)\b/i, evidence: "User references training, mentoring, onboarding, coaching, teaching, or tutoring." },
  { skill: "Scheduling", pattern: /\b(schedule|roster|shift|calendar|timeline)\b/i, evidence: "User references scheduling, shift coordination, calendars, or timelines." },
  { skill: "Inventory or stock control", pattern: /\b(inventory|stock|ordering|supplies|materials|vendor)\b/i, evidence: "User references inventory, stock, ordering, supplies, materials, or vendor work." },
  { skill: "Project or event coordination", pattern: /\b(project|event|coordinate|organize|club|fundraiser)\b/i, evidence: "User references projects, events, coordination, organization, clubs, or fundraising." },
  { skill: "Administrative coordination", pattern: /\b(admin|administrative|office manager|reception|calendar|filing|documentation)\b/i, evidence: "User references administrative, office, calendar, documentation, or coordination work." },
  { skill: "Digital communication", pattern: /\b(social media|community manager|creator|content calendar|online community|engagement)\b/i, evidence: "User references social, creator, content, community, or engagement work." },
  { skill: "Safety or quality standards", pattern: /\b(safety|quality|compliance|standards|inspection|qa)\b/i, evidence: "User references safety, quality, compliance, standards, inspections, or QA." },
  { skill: "Reporting or KPI awareness", pattern: /\b(kpi|metric|report|target|goal|analytics|data)\b/i, evidence: "User references metrics, reports, targets, goals, analytics, or data." }
];

const FUNCTION_KEYWORDS: Array<{ functionName: string; pattern: RegExp }> = [
  { functionName: "Operations", pattern: /\b(operation|inventory|schedule|workflow|process|vendor|quality|logistics|handoff)\b/i },
  { functionName: "Relationship management", pattern: /\b(customer|client|guest|account|relationship|retention|trust|follow.?up)\b/i },
  { functionName: "Leadership and coaching", pattern: /\b(lead|manager|supervis|train|coach|mentor|captain|trusted)\b/i },
  { functionName: "Project coordination", pattern: /\b(project|timeline|coordinate|event|deadline|status|blocker)\b/i },
  { functionName: "Analytical communication", pattern: /\b(write|research|interview|analy|report|content|strategy|explain)\b/i },
  { functionName: "Service recovery", pattern: /\b(escalat|complaint|conflict|resolve|service recovery|problem)\b/i },
  { functionName: "Administrative coordination", pattern: /\b(admin|administrative|office manager|reception|calendar|documentation|files?|requests?)\b/i },
  { functionName: "Digital engagement", pattern: /\b(social media|community manager|creator|content calendar|online community|engagement)\b/i }
];

export function extractTransferableSkillProfile(
  text: string,
  targetRole?: string | null
): TransferableSkillExtraction {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const signals = inferTransferableSkillSignals(cleanText, targetRole);
  const transitions = inferTransitionRecommendations(cleanText);
  const explicitSkills = dedupeBy(
    EXPLICIT_SKILL_PATTERNS
      .filter((item) => item.pattern.test(cleanText))
      .map((item) => ({ skill: item.skill, evidence: item.evidence })),
    (item) => item.skill.toLowerCase()
  ).slice(0, 10);

  const implicitSkills = dedupeBy(
    signals.flatMap((signal) =>
      splitSkillList(signal.mapsTo).map((skill) => ({
        skill,
        evidence: `${signal.source}: ${signal.evidenceExamples[0] ?? "User-provided career evidence"}`,
        whyRecruitersCare: signal.why,
        confidence: signal.confidence
      }))
    ),
    (item) => item.skill.toLowerCase()
  ).slice(0, 12);

  const professionalFunctions = dedupeBy(
    [
      ...FUNCTION_KEYWORDS
        .filter((item) => item.pattern.test(cleanText))
        .map((item) => ({
          functionName: item.functionName,
          evidence: `Detected from user evidence mentioning ${item.functionName.toLowerCase()}-related work.`,
          recruiterLanguage: functionRecruiterLanguage(item.functionName)
        })),
      ...signals.map((signal) => ({
        functionName: primaryFunction(signal),
        evidence: signal.evidenceExamples.slice(0, 2).join("; "),
        recruiterLanguage: signal.recruiterLanguage
      }))
    ],
    (item) => item.functionName.toLowerCase()
  ).slice(0, 8);

  return {
    explicitSkills,
    implicitSkills,
    transferableSkills: dedupeStrings([
      ...explicitSkills.map((item) => item.skill),
      ...implicitSkills.map((item) => item.skill)
    ]).slice(0, 18),
    professionalFunctions,
    adjacentCareers: dedupeStrings([
      ...signals.flatMap((signal) => signal.adjacentCareers),
      ...transitions.map((item) => item.title)
    ]).slice(0, 10),
    recruiterConcerns: buildRecruiterConcernNotes(signals, targetRole),
    evidenceNotes: signals
      .map((signal) => `${signal.source}: ${signal.recruiterLanguage}`)
      .slice(0, 6)
  };
}

export function formatTransferableExtractionForPrompt(extraction: TransferableSkillExtraction): string {
  return [
    section("Explicit skills", extraction.explicitSkills.map((item) => `${item.skill}: ${item.evidence}`)),
    section("Implicit skills recruiters may infer", extraction.implicitSkills.map((item) => `${item.skill}: ${item.whyRecruitersCare} Evidence: ${item.evidence}`)),
    section("Strongest professional functions", extraction.professionalFunctions.map((item) => `${item.functionName}: ${item.recruiterLanguage}`)),
    section("Adjacent careers to test", extraction.adjacentCareers),
    section("Recruiter concerns to prepare for", extraction.recruiterConcerns)
  ].filter(Boolean).join("\n\n");
}

export function transferableExtractionToProfileSkills(extraction: TransferableSkillExtraction): string[] {
  return dedupeStrings([
    ...extraction.transferableSkills,
    ...extraction.professionalFunctions.map((item) => `${item.functionName} function`)
  ]).slice(0, 20);
}

export function transferableExtractionToProfileNotes(extraction: TransferableSkillExtraction): string[] {
  return [
    ...extraction.implicitSkills.slice(0, 6).map((item) =>
      `Inferred transferable skill: ${item.skill}. Evidence: ${item.evidence}. Why recruiters care: ${item.whyRecruitersCare}`
    ),
    ...extraction.professionalFunctions.slice(0, 4).map((item) =>
      `Professional function: ${item.functionName}. Recruiter framing: ${item.recruiterLanguage}`
    ),
    ...extraction.recruiterConcerns.slice(0, 3).map((item) => `Recruiter concern to prepare for: ${item}`)
  ].slice(0, 10);
}

function splitSkillList(value: string): string[] {
  return value
    .split(/,|\band\b/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

function primaryFunction(signal: TransferableSkillSignal): string {
  const text = signal.mapsTo.toLowerCase();
  if (/operation|inventory|vendor|workflow|quality/.test(text)) return "Operations";
  if (/customer|client|account|relationship|service/.test(text)) return "Relationship management";
  if (/coaching|training|leadership|team/.test(text)) return "Leadership and coaching";
  if (/project|coordination|scheduling/.test(text)) return "Project coordination";
  if (/content|communication|research|marketing/.test(text)) return "Analytical communication";
  if (/administrative|calendar|documentation|office/.test(text)) return "Administrative coordination";
  if (/digital|community|engagement|content/.test(text)) return "Digital engagement";
  return "Transferable career evidence";
}

function functionRecruiterLanguage(functionName: string): string {
  if (functionName === "Operations") return "Keeps workflows, standards, resources, and handoffs moving under real constraints.";
  if (functionName === "Relationship management") return "Builds trust, handles expectations, resolves issues, and protects continuity with customers or stakeholders.";
  if (functionName === "Leadership and coaching") return "Helps people perform, learn, stay accountable, and coordinate around shared goals.";
  if (functionName === "Project coordination") return "Sequences work, tracks progress, surfaces blockers, and communicates next steps.";
  if (functionName === "Analytical communication") return "Turns information, research, or stakeholder input into clear decisions, messages, or documentation.";
  if (functionName === "Service recovery") return "Handles friction calmly, restores trust, and solves practical problems under pressure.";
  if (functionName === "Administrative coordination") return "Prioritizes requests, keeps documentation clean, protects timelines, and supports internal or external stakeholders.";
  if (functionName === "Digital engagement") return "Reads audience signals, adapts messaging, coordinates content, and builds trust through communication.";
  return "Connects user evidence to recruiter-readable responsibility.";
}

function section(title: string, items: string[]): string {
  const clean = items.filter(Boolean);
  if (!clean.length) return "";
  return `${title}:\n${clean.map((item) => `- ${item}`).join("\n")}`;
}

function dedupeStrings(values: string[]) {
  return dedupeBy(values.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean), (item) => item.toLowerCase());
}

function dedupeBy<T>(values: T[], keyFor: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}


