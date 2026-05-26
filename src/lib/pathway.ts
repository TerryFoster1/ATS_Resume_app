import { callLlmStructured } from "@/lib/llm";

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
  fastestPathRecommendations: string[];
  lowestCostPathRecommendations: string[];
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
  return {
    status: "preview",
    roleOverview: `${role} roles usually reward candidates who can show relevant context, practical judgment, and credible examples that map to the work rather than just listing generic skills.`,
    commonRequirements: requirements.length ? requirements : DEFAULT_REQUIREMENTS,
    transferableInsight: buildTransferableInsight(input),
    generatedAt: new Date().toISOString()
  };
}

export async function generatePathwayAnalysis(input: PathwayInput): Promise<PathwayFullAnalysis> {
  const role = cleanRole(input.targetRole);
  return callLlmStructured<PathwayFullAnalysis>(
    {
      tag: "career-pathway",
      timeoutMs: 100_000,
      temperature: 0.35,
      maxTokens: 1800,
      system:
        "You are a recruiter-aware career strategist. Create realistic, practical pathway guidance. Do not promise jobs, salaries, instant transitions, or fake experience. Emphasize transferable skills, gaps, low-cost next steps, and honest positioning.",
      user: [
        `Target role: ${role}`,
        input.companyName ? `Company: ${input.companyName}` : "",
        input.resumeText ? `Resume evidence:\n${input.resumeText.slice(0, 12000)}` : "",
        input.currentBackground ? `Current background: ${input.currentBackground}` : "",
        input.jobPosting ? `Job posting:\n${input.jobPosting}` : "",
        "",
        "Return a practical career pathway analysis. Use short, specific bullets. If candidate background is limited, say what to prepare or prove rather than inventing experience."
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
          "fastestPathRecommendations",
          "lowestCostPathRecommendations",
          "suggestedNextSteps"
        ],
        properties: {
          typicalRequirements: arraySchema("Typical role requirements and recruiter expectations."),
          transferableStrengths: arraySchema("Transferable strengths the user may be able to position."),
          likelySkillGaps: arraySchema("Likely skill or proof gaps to close."),
          fastestPathRecommendations: arraySchema("Fastest practical path recommendations."),
          lowestCostPathRecommendations: arraySchema("Lowest-cost path recommendations."),
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

function buildTransferableInsight(input: PathwayInput): string {
  const background = `${input.resumeText ?? ""}\n${input.currentBackground ?? ""}`.toLowerCase();
  if (/\b(retail|restaurant|hospitality|server|chef|barista)\b/.test(background)) {
    return "Your customer-facing background may already support relationship management, prioritization under pressure, conflict resolution, and service recovery examples if you frame them in the language of the target role.";
  }
  if (/\b(journalism|writer|editor|content|communications)\b/.test(background)) {
    return "Your communication background may translate into stakeholder messaging, research, audience understanding, and clear documentation if you connect it to the role's business outcomes.";
  }
  if (/\b(teacher|education|training|coach)\b/.test(background)) {
    return "Your teaching or coaching background may translate into onboarding, stakeholder communication, needs assessment, and structured explanation.";
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
    "fastestPathRecommendations",
    "lowestCostPathRecommendations",
    "suggestedNextSteps"
  ].every((key) => Array.isArray(value[key]) && value[key].every((item) => typeof item === "string"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
