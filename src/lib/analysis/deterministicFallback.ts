import type {
  AnalysisResult,
  Importance,
  JobRequirement,
  RequirementIntent,
  RequirementKind
} from "../types";
import { findClustersInText } from "../knowledge/skillClusters";
import { findToolCategory } from "../knowledge/toolMappings";
import { parseRequiredYears } from "../utils/dates";
import { splitLines } from "../utils/normalizeText";
import { fastRescoreWithExistingRequirements } from "./fastRescore";
import {
  getRequirementSuppressionReason,
  logJobAdItemDiagnostics
} from "./jobAdItems";
import { hasMetaAdsPlatformSignal } from "./platformSynonyms";
import { stableRequirementId } from "./stableIds";

export function fallbackAnalyzeWithoutLlm(args: {
  resumeText: string;
  jobPostText: string;
}): AnalysisResult {
  const requirements = extractFallbackRequirements(args.jobPostText);
  const baseline: AnalysisResult = {
    requirements,
    evidence: [],
    matches: [],
    buckets: {
      strengths: [],
      partials: [],
      clarifications: [],
      missing: []
    },
    followUps: [],
    score: 0,
    scoreSummary: "Fallback analysis used because structured extraction failed.",
    fallbackReason:
      "Claude structured extraction failed, so the app used a faster local requirement scan."
  };
  const analysis = fastRescoreWithExistingRequirements({
    resumeText: args.resumeText,
    baseline
  });
  return {
    ...analysis,
    fallbackReason: baseline.fallbackReason
  };
}

function extractFallbackRequirements(jobPostText: string): JobRequirement[] {
  const candidates = splitJobRequirements(jobPostText)
    .map(cleanRequirement)
    .filter(Boolean)
    .filter((line) => !isIgnorableJobLine(line))
    .slice(0, 16);

  const unique = new Map<string, string>();
  for (const candidate of candidates) {
    const id = stableRequirementId(candidate);
    if (!unique.has(id)) unique.set(id, candidate);
  }

  const allRequirements = [...unique.values()].slice(0, 12).map((text) => {
    const tool = findToolCategory(text);
    const kind = inferKind(text, Boolean(tool));
    return {
      id: stableRequirementId(text),
      text,
      kind,
      intent: inferIntent(text, kind),
      importance: inferImportance(text, kind),
      skillClusters: findClustersInText(text, "jd"),
      yearsRequired: parseRequiredYears(text),
      toolCategory: tool?.id
    };
  });
  addCoreFallbackRequirements(allRequirements, jobPostText);
  logJobAdItemDiagnostics(allRequirements, jobPostText);
  return allRequirements.filter((requirement) => !getRequirementSuppressionReason(requirement, jobPostText));
}

function splitJobRequirements(jobPostText: string): string[] {
  const lineItems = splitLines(jobPostText);
  const sentenceItems = jobPostText
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim());
  return [...lineItems, ...sentenceItems]
    .map((item) => item.replace(/^[•*\-–—\d.)\s]+/, "").trim())
    .filter((item) => item.length >= 18 && item.length <= 220);
}

function cleanRequirement(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[,:;\s]+|[,:;\s]+$/g, "")
    .trim();
}

function inferKind(text: string, hasKnownTool: boolean): RequirementKind {
  const lowered = text.toLowerCase();
  if (hasMetaAdsPlatformSignal(text) || hasKnownTool || /\b(excel|powerpoint|office|crm|software|platform|system|tool|dashboards?|kpis?|metrics?)\b/.test(lowered)) {
    return "TOOL";
  }
  if (/\b(license|licence|licensed|certification|certified|certificate|credential|apprentice|apprenticeship|red seal|degree|diploma)\b/.test(lowered)) {
    return /\b(degree|diploma|college|university|post-secondary|post secondary)\b/.test(lowered)
      ? "EDUCATION"
      : "CERTIFICATION";
  }
  if (parseRequiredYears(text)) return "EXPERIENCE_YEARS";
  if (/\b(industry|sector|plumbing|construction|healthcare|insurance|finance|saas|retail|hospitality)\b/.test(lowered)) {
    return "INDUSTRY";
  }
  if (/\b(result|revenue|profit|margin|retention|growth|performance|metric|kpi)\b/.test(lowered)) {
    return "OUTCOME";
  }
  if (/\b(communication|organized|time management|detail|team|collaboration|problem solving)\b/.test(lowered)) {
    return "SOFT_SKILL";
  }
  return "RESPONSIBILITY";
}

function addCoreFallbackRequirements(
  requirements: JobRequirement[],
  jobPostText: string
): void {
  for (const line of splitLines(jobPostText)) {
    if (hasMetaAdsPlatformSignal(line)) {
      upsertRequirement(requirements, line, {
        kind: "TOOL",
        intent: "MUST_HAVE",
        importance: "HIGH",
        toolCategory: "meta_ads_platform"
      });
      continue;
    }
    if (/\bcrm\b/i.test(line) && /\b(documentation|records?|notes?|internal systems?|pipeline|follow[-\s]?up)\b/i.test(line)) {
      upsertRequirement(requirements, line, {
        kind: "TOOL",
        intent: "MUST_HAVE",
        importance: "HIGH"
      });
      continue;
    }
    if (/\b(track|monitor|report|dashboard|kpi|metric|performance|progress)\b/i.test(line) && /\b(client|campaign|performance|dashboard|kpi|metric|progress|results?)\b/i.test(line)) {
      upsertRequirement(requirements, line, {
        kind: "OUTCOME",
        intent: "MUST_HAVE",
        importance: "HIGH"
      });
      continue;
    }
    if (/\b(onboard|train|training|script|framework|check[-\s]?ins?|next steps|updates?)\b/i.test(line) && /\b(client|customer|users?|portfolio|communication|communicate)\b/i.test(line)) {
      upsertRequirement(requirements, line, {
        kind: "RESPONSIBILITY",
        intent: "MUST_HAVE",
        importance: "HIGH"
      });
    }
  }
}

function upsertRequirement(
  requirements: JobRequirement[],
  text: string,
  overrides: Pick<JobRequirement, "kind" | "intent" | "importance"> & { toolCategory?: string }
): void {
  const cleaned = cleanRequirement(text);
  const existing = requirements.find((requirement) =>
    requirement.id === stableRequirementId(cleaned) ||
    (overrides.toolCategory === "meta_ads_platform" && hasMetaAdsPlatformSignal(requirement.text))
  );
  const clusters = findClustersInText(cleaned, "jd");
  if (existing) {
    existing.kind = overrides.kind;
    existing.intent = overrides.intent;
    existing.importance = overrides.importance;
    existing.toolCategory = overrides.toolCategory ?? existing.toolCategory;
    existing.skillClusters = [...new Set([...existing.skillClusters, ...clusters])];
    return;
  }
  requirements.push({
    id: stableRequirementId(cleaned),
    text: cleaned,
    kind: overrides.kind,
    intent: overrides.intent,
    importance: overrides.importance,
    skillClusters: clusters,
    yearsRequired: parseRequiredYears(cleaned),
    toolCategory: overrides.toolCategory
  });
}

function inferIntent(text: string, kind: RequirementKind): RequirementIntent {
  const lowered = text.toLowerCase();
  if (/\b(preferred|asset|nice to have|bonus)\b/.test(lowered)) return "PREFERRED";
  if (
    kind === "CERTIFICATION" ||
    kind === "EXPERIENCE_YEARS" ||
    /\b(required|must|valid|minimum|at least|need to have|need|hold|eligible)\b/.test(lowered)
  ) {
    return "MUST_HAVE";
  }
  if (/\b(will|responsible for|duties|day to day|you will)\b/.test(lowered)) return "RESPONSIBILITY";
  return "TRANSFERABLE";
}

function inferImportance(text: string, kind: RequirementKind): Importance {
  const lowered = text.toLowerCase();
  if (
    kind === "CERTIFICATION" ||
    kind === "EXPERIENCE_YEARS" ||
    /\b(required|must|valid|minimum|at least|license|licence|certification)\b/.test(lowered)
  ) {
    return "HIGH";
  }
  if (/\b(preferred|asset|nice to have|bonus)\b/.test(lowered)) return "LOW";
  return "MEDIUM";
}

function isIgnorableJobLine(text: string): boolean {
  const lowered = text.toLowerCase();
  if (/\b(equal opportunity|benefits|salary|compensation|perks|about us|our company|culture|apply now|we thank|accommodation|privacy)\b/.test(lowered)) {
    return true;
  }
  if (/\b(join us in our fight|our mission is|our purpose is|we believe|we are committed to|you belong here|make access to|right and not a privilege|highest quality hygiene|wellness.*right|nourishment a right|we offer|submit your application|application process)\b/.test(lowered)) {
    return true;
  }
  if (/\b(full[-\s]?time|part[-\s]?time|temporary|permanent|contract|fixed[-\s]?term|15[-\s]?month|12[-\s]?month)\b/.test(lowered)) {
    return true;
  }
  if (/\b(mississauga|toronto|kitchener|waterloo|ontario|canada|remote|hybrid)\b/.test(lowered) && lowered.split(/\s+/).length <= 7) {
    return true;
  }
  if (/\b(people leader|hiring manager|reports to|reporting to|vp product|vice president)\b/.test(lowered)) {
    return true;
  }
  return false;
}
