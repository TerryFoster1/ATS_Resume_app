// Single-call wrapper around the analyze prompt.
//
// The model returns a structured AnalyzeToolInput; we coerce / validate it
// into our domain types (JobRequirement / ResumeEvidence / MatchEvaluation)
// and hand it back. NO scoring, NO Decision Enforcement here â€” those run
// as deterministic post-processors in analyze.ts.

import { ANALYZE_MODEL, callLlmStructured } from "../llm";
import {
  ANALYZE_SCHEMA,
  ANALYZE_SYSTEM,
  buildAnalyzeUserPrompt
} from "../prompts/analyzePrompt";
import type { AnalyzeToolInput } from "../prompts/analyzePrompt";
import type {
  JobRequirement,
  MatchEvaluation,
  ResumeEvidence
} from "../types";
import {
  findClustersInText,
  type ClusterId
} from "../knowledge/skillClusters";
import { findToolCategory } from "../knowledge/toolMappings";
import { parseRangeToYears, parseRequiredYears } from "../utils/dates";
import { splitLines } from "../utils/normalizeText";
import { elapsedMs, logDevTiming, nowMs } from "../utils/perf";
import {
  getRequirementSuppressionReason,
  logJobAdItemDiagnostics
} from "./jobAdItems";
import { canonicalPlatformLabel, hasMetaAdsPlatformSignal } from "./platformSynonyms";
import { stableRequirementId } from "./stableIds";

export interface ExtractAndMatchResult {
  requirements: JobRequirement[];
  evidence: ResumeEvidence[];
  matches: MatchEvaluation[];
}

const VALID_CLUSTERS: Set<ClusterId> = new Set([
  "CLIENT_FACING",
  "ACCOUNT_GROWTH",
  "SALES_ENABLEMENT",
  "PROJECT_MANAGEMENT",
  "PROFITABILITY",
  "CRM_PIPELINE",
  "OPERATIONS",
  "PEOPLE_LEADERSHIP",
  "DATA_ANALYSIS",
  "WRITING_COMMUNICATION",
  "TECHNICAL_SUPPORT"
]);

function filterClusters(ids: string[]): ClusterId[] {
  return ids.filter((c): c is ClusterId =>
    VALID_CLUSTERS.has(c as ClusterId)
  );
}

function mergeClusters(...groups: ClusterId[][]): ClusterId[] {
  return [...new Set(groups.flat())];
}

export async function extractAndMatch(args: {
  resumeText: string;
  jobPostText: string;
  timeoutMs?: number;
}): Promise<ExtractAndMatchResult> {
  const started = nowMs();
  const raw = await callLlmStructured<AnalyzeToolInput>(
    {
      system: ANALYZE_SYSTEM,
      user: buildAnalyzeUserPrompt({
        resumeText: args.resumeText,
        jobPostText: args.jobPostText
      }),
      maxTokens: 2800,
      model: ANALYZE_MODEL,
      temperature: 0.2,
      timeoutMs: args.timeoutMs ?? getAnalyzeTimeoutMs(),
      tag: "analyze"
    },
    ANALYZE_SCHEMA
  );
  logDevTiming("analyze.claude", {
    ms: elapsedMs(started),
    model: ANALYZE_MODEL
  });

  // Coerce â€” accept the model's strings, scrub any unknown cluster IDs, and
  // skip rows without the required fields. We're permissive on the way in
  // so transient model glitches don't break the whole pipeline.
  const rawToStableReqId = new Map<string, string>();

  const allRequirements: JobRequirement[] = (raw.requirements ?? [])
    .filter((r) => r && r.id && r.text)
    .map((r) => {
      const text = r.text.trim();
      const toolCategory =
        r.toolCategory ?? findToolCategory(text)?.id;
      const stableId = stableRequirementId(text);
      rawToStableReqId.set(r.id, stableId);
      return {
        id: stableId,
        text,
        kind: r.kind,
        intent: r.intent,
        importance: r.importance,
        skillClusters: mergeClusters(
          filterClusters(r.skillClusters ?? []),
          findClustersInText(text, "jd")
        ),
        yearsRequired: r.yearsRequired ?? parseRequiredYears(text),
        toolCategory
      };
    });

  addDeterministicCoreRequirements(allRequirements, args.jobPostText);

  logJobAdItemDiagnostics(allRequirements, args.jobPostText);

  const requirements = allRequirements
    // Filter IGNORE and job metadata (title, location, contract type, reporting
    // lines, benefits, boilerplate) so they don't enter scoring or questions.
    .filter((r) => !getRequirementSuppressionReason(r, args.jobPostText));

  const validReqIds = new Set(requirements.map((r) => r.id));

  const evidence: ResumeEvidence[] = (raw.evidence ?? [])
    .filter((e) => e && e.id && e.text)
    .map((e) => {
      const text = e.text.trim();
      const years = parseEvidenceYears(text);
      return {
        id: e.id,
        source: {
          company: e.source?.company,
          title: e.source?.title,
          section: e.source?.section ?? "OTHER"
        },
        text,
        skillClusters: mergeClusters(
          filterClusters(e.skillClusters ?? []),
          findClustersInText(text, "resume")
        ),
        toolsNamed: mergeTools(
          (e.toolsNamed ?? []).map((t) => t.trim()).filter(Boolean),
          text
        ),
        dateRange:
          e.dateRange?.approximateYears || years === undefined
            ? e.dateRange
            : { ...e.dateRange, approximateYears: years }
      };
    });

  const deterministicEvidence = buildDeterministicEvidence({
    resumeText: args.resumeText,
    existing: evidence
  });
  evidence.push(...deterministicEvidence);

  const validEvIds = new Set(evidence.map((e) => e.id));

  const matches: MatchEvaluation[] = (raw.matches ?? [])
    .filter(
      (m) => m && m.requirementId && validReqIds.has(rawToStableReqId.get(m.requirementId) ?? m.requirementId)
    )
    .map((m) => ({
      requirementId: rawToStableReqId.get(m.requirementId) ?? m.requirementId,
      requirementText: requirements.find((r) => r.id === (rawToStableReqId.get(m.requirementId) ?? m.requirementId))?.text ?? m.requirementText,
      requirementImportance: m.requirementImportance,
      classification: m.classification,
      confidence: m.confidence,
      lens: m.lens,
      // Drop unknown evidence IDs so downstream code can trust them.
      evidenceIds: (m.evidenceIds ?? []).filter((id) => validEvIds.has(id)),
      reasoning: m.reasoning,
      clarificationQuestion: m.clarificationQuestion?.trim() || undefined
    }));

  for (const req of requirements) {
    if (matches.some((m) => m.requirementId === req.id)) continue;
    matches.push({
      requirementId: req.id,
      requirementText: req.text,
      requirementImportance: req.importance,
      classification: "MISSING",
      confidence: "LOW",
      lens: "NONE",
      evidenceIds: [],
      reasoning: "No matching evidence was returned in the initial extraction."
    });
  }

  return { requirements, evidence, matches };
}

export function buildDeterministicEvidence(args: {
  resumeText: string;
  existing: ResumeEvidence[];
}): ResumeEvidence[] {
  const existingTexts = new Set(args.existing.map((e) => e.text.toLowerCase()));
  const additions: ResumeEvidence[] = [];
  for (const line of splitLines(args.resumeText)) {
    if (existingTexts.has(line.toLowerCase())) continue;
    const clusters = findClustersInText(line, "resume");
    const toolsNamed = mergeTools([], line);
    const years = parseEvidenceYears(line);
    const isEducation = isEducationEvidenceLine(line);
    if (
      clusters.length === 0 &&
      toolsNamed.length === 0 &&
      years === undefined &&
      !isEducation
    ) {
      continue;
    }
    additions.push({
      id: `ev-det-${hashEvidenceLine(line)}-${additions.length + 1}`,
      source: { section: isEducation ? "EDUCATION" : "OTHER" },
      text: line,
      skillClusters: clusters,
      toolsNamed,
      dateRange: years === undefined ? undefined : { approximateYears: years }
    });
  }
  return additions;
}

function getAnalyzeTimeoutMs(): number {
  const raw = Number(process.env.ANTHROPIC_ANALYZE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 25_000;
}

function isEducationEvidenceLine(text: string): boolean {
  return /\b(degree|diploma|certificate|certification|college|university|post-secondary|post secondary|journalism|multimedia|media|communications?|marketing|business administration|education)\b/i.test(
    text
  );
}

function parseEvidenceYears(text: string): number | undefined {
  const rangeYears = parseRangeToYears(text);
  if (rangeYears !== undefined) return rangeYears;
  const plus = text.match(/\b(\d{1,2})\s*\+\s*(?:years|yrs?)\b/i);
  if (plus) return parseInt(plus[1], 10);
  const decade = text.match(/\bover\s+a\s+decade\b|\bdecade\b/i);
  if (decade) return 10;
  const years = text.match(/\b(\d{1,2})\s*(?:years|yrs?)\b/i);
  if (years) return parseInt(years[1], 10);
  return undefined;
}

function mergeTools(existing: string[], text: string): string[] {
  const tools = new Set(existing);
  if (hasMetaAdsPlatformSignal(text)) {
    tools.add(canonicalPlatformLabel("meta_ads_platform"));
  }
  const cat = findToolCategory(text);
  if (!cat) return [...tools];
  for (const tool of cat.tools) {
    if (text.toLowerCase().includes(tool.toLowerCase())) {
      tools.add(tool);
    }
  }
  if (cat.categorySignals.some((s) => text.toLowerCase().includes(s))) {
    tools.add(cat.label);
  }
  return [...tools];
}

function addDeterministicCoreRequirements(
  requirements: JobRequirement[],
  jobPostText: string
): void {
  const lines = splitLines(jobPostText);
  const fullText = jobPostText.toLowerCase();

  for (const line of lines) {
    if (hasMetaAdsPlatformSignal(line)) {
      upsertDeterministicRequirement(requirements, {
        text: cleanRequirementText(line),
        kind: "TOOL",
        intent: "MUST_HAVE",
        importance: "HIGH",
        skillClusters: ["DATA_ANALYSIS"],
        toolCategory: "meta_ads_platform"
      });
      continue;
    }

    if (/\bcrm\b/i.test(line) && /\b(documentation|records?|notes?|internal systems?|pipeline|follow[-\s]?up)\b/i.test(line)) {
      upsertDeterministicRequirement(requirements, {
        text: cleanRequirementText(line),
        kind: "TOOL",
        intent: "MUST_HAVE",
        importance: "HIGH",
        skillClusters: ["CRM_PIPELINE", "OPERATIONS", "CLIENT_FACING"]
      });
      continue;
    }

    if (/\b(track|monitor|report|dashboard|kpi|metric|performance|progress)\b/i.test(line) && /\b(client|campaign|performance|dashboard|kpi|metric|progress|results?)\b/i.test(line)) {
      upsertDeterministicRequirement(requirements, {
        text: cleanRequirementText(line),
        kind: "OUTCOME",
        intent: "MUST_HAVE",
        importance: "HIGH",
        skillClusters: ["DATA_ANALYSIS", "CLIENT_FACING"]
      });
      continue;
    }

    if (/\b(onboard|train|training|script|framework|check[-\s]?ins?|next steps|updates?)\b/i.test(line) && /\b(client|customer|users?|portfolio|communication|communicate)\b/i.test(line)) {
      upsertDeterministicRequirement(requirements, {
        text: cleanRequirementText(line),
        kind: "RESPONSIBILITY",
        intent: "MUST_HAVE",
        importance: "HIGH",
        skillClusters: ["CLIENT_FACING", "WRITING_COMMUNICATION", "OPERATIONS"]
      });
      continue;
    }

    if (/\b(bachelor|degree|diploma|college|university|communications?|marketing|business)\b/i.test(line) && /\b(degree|bachelor|diploma|similar|communications?|marketing|business)\b/i.test(line)) {
      upsertDeterministicRequirement(requirements, {
        text: cleanRequirementText(line),
        kind: "EDUCATION",
        intent: /must[-\s]?have|required|bachelor/i.test(`${line} ${fullText}`) ? "MUST_HAVE" : "PREFERRED",
        importance: "HIGH",
        skillClusters: ["WRITING_COMMUNICATION"]
      });
    }
  }
}

function upsertDeterministicRequirement(
  requirements: JobRequirement[],
  input: Omit<JobRequirement, "id" | "yearsRequired"> & { yearsRequired?: JobRequirement["yearsRequired"] }
): void {
  const existing = requirements.find((requirement) =>
    requirement.id === stableRequirementId(input.text) ||
    overlapRequirement(input.text, requirement.text) ||
    (input.toolCategory === "meta_ads_platform" && hasMetaAdsPlatformSignal(requirement.text))
  );
  if (existing) {
    existing.kind = input.kind;
    existing.intent = strongerIntent(existing.intent, input.intent);
    existing.importance = strongerImportance(existing.importance, input.importance);
    existing.skillClusters = mergeClusters(
      existing.skillClusters,
      input.skillClusters,
      findClustersInText(input.text, "jd")
    );
    existing.toolCategory = input.toolCategory ?? existing.toolCategory;
    existing.yearsRequired = input.yearsRequired ?? existing.yearsRequired;
    return;
  }

  requirements.push({
    ...input,
    id: stableRequirementId(input.text),
    skillClusters: mergeClusters(input.skillClusters, findClustersInText(input.text, "jd")),
    yearsRequired: input.yearsRequired ?? parseRequiredYears(input.text)
  });
}

function strongerIntent(
  current: JobRequirement["intent"],
  next: JobRequirement["intent"]
): JobRequirement["intent"] {
  const rank: Record<JobRequirement["intent"], number> = {
    MUST_HAVE: 4,
    RESPONSIBILITY: 3,
    TRANSFERABLE: 2,
    PREFERRED: 1,
    IGNORE: 0
  };
  return rank[next] > rank[current] ? next : current;
}

function strongerImportance(
  current: JobRequirement["importance"],
  next: JobRequirement["importance"]
): JobRequirement["importance"] {
  const rank: Record<JobRequirement["importance"], number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };
  return rank[next] > rank[current] ? next : current;
}

function overlapRequirement(a: string, b: string): boolean {
  const left = new Set(
    a.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4)
  );
  const right = new Set(
    b.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4)
  );
  if (left.size === 0 || right.size === 0) return false;
  let overlap = 0;
  for (const word of left) {
    if (right.has(word)) overlap += 1;
  }
  return overlap >= 3;
}

function cleanRequirementText(text: string): string {
  return text
    .replace(/^\s*(?:[-*]|\u2022|\d+[.)])\s*/, "")
    .replace(/^\s*(must[-\s]?have|required|mandatory|qualifications?)\s*:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashEvidenceLine(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}


