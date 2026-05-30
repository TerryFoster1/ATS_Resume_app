import { callLlmStructured } from "@/lib/llm";
import {
  buildRecruiterConcernNotes,
  inferTransferableSkillSignals,
  inferTransitionRecommendations,
  recommendLowCostLearning
} from "@/lib/careerIntelligence";
import {
  extractTransferableSkillProfile,
  formatTransferableExtractionForPrompt
} from "@/lib/transferableSkillExtraction";

export type PathwayPreview = {
  status: "preview" | "completed";
  roleOverview: string;
  commonRequirements: string[];
  transferableInsight: string;
  generatedAt: string;
  full?: PathwayFullAnalysis;
};

export type PathwayFullAnalysis = {
  typicalRequirements: string[];
  transferableStrengths: string[];
  likelySkillGaps: string[];
  recruiterConcerns?: string[];
  fastestPathRecommendations: string[];
  lowestCostPathRecommendations: string[];
  suggestedCredentials?: string[];
  learningRecommendations?: string[];
  expectedTimeline?: string[];
  salaryRange?: string[];
  dayInTheLife?: string[];
  suggestedNextSteps: string[];
};

export type PathwayInput = {
  targetRole: string;
  companyName?: string | null;
  jobPosting?: string | null;
  currentBackground?: string | null;
  resumeText?: string | null;
};

const DEFAULT_REQUIREMENTS = [
  "Clear communication with stakeholders or customers",
  "Evidence of ownership, follow-through, and prioritization",
  "Comfort learning role-specific tools and workflows",
  "Examples of measurable outcomes or operational improvements"
];

export function buildPathwayPreview(input: PathwayInput): PathwayPreview {
  const role = cleanRole(input.targetRole);
  const requirements = inferCommonRequirements(input).slice(0, 5);
  const signals = inferTransferableSkillSignals(
    `${input.resumeText ?? ""}\n${input.currentBackground ?? ""}`,
    role
  );
  return {
    status: "preview",
    roleOverview: `${role} roles usually reward candidates who can connect their past work to the hiring team's real concerns: ownership, judgment, communication, follow-through, and credible examples that map to the role.`,
    commonRequirements: requirements.length ? requirements : DEFAULT_REQUIREMENTS,
    transferableInsight: buildTransferableInsight(input, signals),
    generatedAt: new Date().toISOString()
  };
}

export async function generatePathwayAnalysis(input: PathwayInput): Promise<PathwayFullAnalysis> {
  const role = cleanRole(input.targetRole);
  const sourceText = `${input.resumeText ?? ""}\n${input.currentBackground ?? ""}`;
  const signals = inferTransferableSkillSignals(sourceText, role);
  const extraction = extractTransferableSkillProfile(sourceText, role);
  const recruiterConcerns = buildRecruiterConcernNotes(signals, role);
  const transitionRecommendations = inferTransitionRecommendations(sourceText)
    .map((item) => `${item.title} (${item.category}): ${item.whyRealistic} First move: ${item.firstMove}`)
    .join("\n");
  return callLlmStructured<PathwayFullAnalysis>(
    {
      tag: "career-pathway",
      timeoutMs: 100_000,
      temperature: 0.35,
      maxTokens: 1800,
      system: [
        "You are a recruiter-aware career strategist for Career Ladder.",
        "Create realistic, practical pathway guidance that explains how hiring teams would evaluate the transition.",
        "Do not promise jobs, salaries, instant transitions, or fake experience.",
        "Emphasize transferable skills, proof gaps, practical sequencing, low-cost next steps, and honest positioning.",
        "Think in this order: current experience -> transferable functions -> adjacent careers -> proof gaps -> practical upskilling.",
        "Separate true skill gaps from evidence gaps and language gaps.",
        "Explain why the transition is realistic without inflating titles or inventing responsibilities.",
        "Translate adjacent experience when credible: retail to customer success, hospitality to operations, journalism to marketing, service industry to account management, trades to project coordination.",
        "Avoid generic certification lists unless a certification is genuinely useful for the role context."
      ].join("\n"),
      user: [
        `Target role: ${role}`,
        input.companyName ? `Company: ${input.companyName}` : "",
        input.resumeText ? `Resume evidence:\n${input.resumeText.slice(0, 12000)}` : "",
        input.currentBackground ? `Current background: ${input.currentBackground}` : "",
        input.jobPosting ? `Job posting:\n${input.jobPosting}` : "",
        `Transferable skill extraction:\n${formatTransferableExtractionForPrompt(extraction)}`,
        `Detected transferable skill signals:\n${signals.map((signal) => `- ${signal.source} -> ${signal.mapsTo}. Recruiter language: ${signal.recruiterLanguage}. Evidence examples: ${signal.evidenceExamples.join("; ")}`).join("\n")}`,
        recruiterConcerns.length ? `Likely recruiter concerns:\n${recruiterConcerns.map((item) => `- ${item}`).join("\n")}` : "",
        transitionRecommendations ? `Adjacent transition logic:\n${transitionRecommendations}` : "",
        `Low-cost learning options to consider only if relevant: ${recommendLowCostLearning(role).join("; ")}`,
        "",
        "Return a practical career pathway analysis. Use short, specific bullets. If candidate background is limited, say what to prepare or prove rather than inventing experience.",
        "For fastestPathRecommendations, prioritize sequencing: what to reframe first, what proof to gather next, and what to practice for recruiter conversations.",
        "For lowestCostPathRecommendations, prefer free or low-cost practice, terminology building, portfolio examples, informational interviews, tool sandboxes, and proof-gathering steps over expensive programs.",
        "For likelySkillGaps, distinguish true skill gaps from communication or evidence gaps when possible.",
        "For recruiterConcerns, explain what a skeptical hiring manager may question and how to prepare evidence.",
        "For salaryRange, use broad cautious ranges or relative positioning, and state that local market verification is needed.",
        "For dayInTheLife, describe realistic work moments, not glamour."
      ]
        .filter(Boolean)
        .join("\n\n")
    },
    {
      toolName: "create_pathway_analysis",
      description: "Create a practical career pathway analysis.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: [
          "typicalRequirements",
          "transferableStrengths",
          "likelySkillGaps",
          "recruiterConcerns",
          "fastestPathRecommendations",
          "lowestCostPathRecommendations",
          "suggestedCredentials",
          "learningRecommendations",
          "expectedTimeline",
          "salaryRange",
          "dayInTheLife",
          "suggestedNextSteps"
        ],
        properties: {
          typicalRequirements: arraySchema("Typical role requirements and recruiter expectations."),
          transferableStrengths: arraySchema("Transferable strengths the user may be able to position."),
          likelySkillGaps: arraySchema("Likely skill or proof gaps to close."),
          recruiterConcerns: arraySchema("Likely recruiter concerns or objections to prepare for."),
          fastestPathRecommendations: arraySchema("Fastest practical path recommendations."),
          lowestCostPathRecommendations: arraySchema("Lowest-cost path recommendations."),
          suggestedCredentials: arraySchema("Credentials or proof signals worth considering, only when realistically useful."),
          learningRecommendations: arraySchema("Contextual certifications, schools, programs, or practical learning resources with relevance explained."),
          expectedTimeline: arraySchema("Realistic timeline notes or milestones."),
          salaryRange: arraySchema("Broad salary or compensation context with caveats to verify locally."),
          dayInTheLife: arraySchema("Realistic day-in-the-life work moments."),
          suggestedNextSteps: arraySchema("Suggested next actions inside or outside Career Ladder.")
        }
      }
    }
  );
}

export function readPathwaySnapshot(snapshot: unknown): PathwayPreview | null {
  if (!isRecord(snapshot) || !isRecord(snapshot.pathway)) return null;
  const value = snapshot.pathway;
  const commonRequirements = Array.isArray(value.commonRequirements)
    ? value.commonRequirements.filter((item): item is string => typeof item === "string")
    : [];
  if (typeof value.roleOverview !== "string" || typeof value.transferableInsight !== "string") {
    return null;
  }
  return {
    status: value.status === "completed" ? "completed" : "preview",
    roleOverview: value.roleOverview,
    commonRequirements,
    transferableInsight: value.transferableInsight,
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : "",
    full: isFullAnalysis(value.full) ? value.full : undefined
  };
}

function arraySchema(description: string) {
  return {
    type: "array",
    description,
    minItems: 3,
    maxItems: 6,
    items: { type: "string", minLength: 12, maxLength: 220 }
  };
}

function inferCommonRequirements(input: PathwayInput): string[] {
  const text = `${input.targetRole} ${input.jobPosting ?? ""}`.toLowerCase();
  const items = new Set<string>();
  if (/\b(account|client|customer success|sales)\b/.test(text)) {
    items.add("Client or customer relationship management");
    items.add("CRM hygiene, follow-up discipline, and account notes");
    items.add("KPI reporting, pipeline awareness, or retention metrics");
  }
  if (/\b(project|operations|coordinator|program)\b/.test(text)) {
    items.add("Project coordination, timelines, and stakeholder follow-through");
    items.add("Process documentation and operational prioritization");
  }
  if (/\bmarketing|campaign|content|social|ads?\b/.test(text)) {
    items.add("Campaign coordination, audience understanding, and performance reporting");
    items.add("Comfort with marketing platforms, content workflows, or analytics");
  }
  if (/\bmanager|lead|supervisor\b/.test(text)) {
    items.add("People coordination, coaching, conflict resolution, and accountability");
  }
  DEFAULT_REQUIREMENTS.forEach((item) => items.add(item));
  return [...items];
}

function buildTransferableInsight(input: PathwayInput, signals = inferTransferableSkillSignals(
  `${input.resumeText ?? ""}\n${input.currentBackground ?? ""}`,
  input.targetRole
)): string {
  const background = `${input.resumeText ?? ""}\n${input.currentBackground ?? ""}`.toLowerCase();
  const roleText = `${input.targetRole} ${input.jobPosting ?? ""}`.toLowerCase();
  const signal = signals[0];
  if (/\b(retail|store|cashier|sales associate|customer service)\b/.test(background)) {
    if (/\b(customer success|client success|account manager|account management)\b/.test(roleText)) {
      return "Your retail or customer-service background may already show customer retention, objection handling, service recovery, and relationship follow-through. The pathway is to frame those examples as account ownership and customer momentum rather than front-line tasks.";
    }
    return "Your customer-facing background may already support relationship management, prioritization under pressure, conflict resolution, and service recovery examples if you frame them in the language of the target role.";
  }
  if (/\b(restaurant|hospitality|server|chef|barista|hotel|front desk|guest experience)\b/.test(background)) {
    if (/\b(operations|coordinator|project|program|office manager)\b/.test(roleText)) {
      return "Your hospitality background may translate into operations through shift coordination, handoffs, service standards, prioritization, and problem solving under time pressure. The key is to show repeatable process ownership, not just busy-service resilience.";
    }
    return "Your hospitality background may already support stakeholder communication, service recovery, prioritization, and operational follow-through if you connect those examples to the target role's outcomes.";
  }
  if (/\b(journalism|writer|editor|content|communications)\b/.test(background)) {
    if (/\b(marketing|campaign|content|brand|social|communications)\b/.test(roleText)) {
      return "Your journalism or communications background may translate into marketing through audience understanding, research, message clarity, editorial judgment, and deadline-driven production. Hiring teams will still want proof of business goals, channel performance, or campaign context.";
    }
    return "Your communication background may translate into stakeholder messaging, research, audience understanding, and clear documentation if you connect it to the role's business outcomes.";
  }
  if (/\b(server|service|call center|support|customer support|client service)\b/.test(background)) {
    if (/\b(account|client|customer success|sales)\b/.test(roleText)) {
      return "Your service background may translate into account-facing work when you show relationship continuity, issue resolution, follow-up discipline, and the ability to protect trust over time.";
    }
  }
  if (/\b(trade|trades|construction|electrician|plumber|carpenter|mechanic|technician|foreman)\b/.test(background)) {
    if (/\b(project|coordinator|operations|scheduler|field|site)\b/.test(roleText)) {
      return "Your trades or field background may support project coordination through sequencing work, managing constraints, communicating with stakeholders, and keeping timelines moving. The gap is often translating hands-on execution into coordination language.";
    }
  }
  if (/\b(teacher|education|training|coach)\b/.test(background)) {
    return "Your teaching or coaching background may translate into onboarding, stakeholder communication, needs assessment, and structured explanation.";
  }
  if (signal) {
    return `${signal.source} may support ${signal.mapsTo}. ${signal.why} In recruiter language, this can become: ${signal.recruiterLanguage} ${signal.recruiterConcern ?? ""}`.trim();
  }
  return "Your most useful transferable strengths will come from concrete examples of communication, ownership, problem solving, follow-through, and measurable impact related to the target role.";
}

function cleanRole(value: string) {
  return value && value !== "Untitled application" ? value : "this target role";
}

function isFullAnalysis(value: unknown): value is PathwayFullAnalysis {
  if (!isRecord(value)) return false;
  return [
    "typicalRequirements",
    "transferableStrengths",
    "likelySkillGaps",
    "recruiterConcerns",
    "fastestPathRecommendations",
    "lowestCostPathRecommendations",
    "suggestedCredentials",
    "learningRecommendations",
    "expectedTimeline",
    "salaryRange",
    "dayInTheLife",
    "suggestedNextSteps"
  ].every((key) => [
      "recruiterConcerns",
      "suggestedCredentials",
      "learningRecommendations",
      "expectedTimeline",
      "salaryRange",
      "dayInTheLife"
    ].includes(key)
    ? value[key] === undefined || (Array.isArray(value[key]) && value[key].every((item) => typeof item === "string"))
    : Array.isArray(value[key]) && value[key].every((item) => typeof item === "string"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
