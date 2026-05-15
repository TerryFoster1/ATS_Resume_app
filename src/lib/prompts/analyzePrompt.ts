// Analyze prompt — the central LLM call that produces a structured analysis
// of how the resume matches the JD.
//
// The model is given the cluster catalogue, the transferable mappings, and
// the rules of engagement (handoff §11–§16). It must return:
//   • JobRequirement[]   — every requirement parsed from the JD, with
//                          intent / importance / cluster tags / kind
//   • ResumeEvidence[]   — bullets from the resume, with cluster tags
//                          and tools/dates
//   • MatchEvaluation[]  — one row per requirement, with classification,
//                          which lens fired, supporting evidence IDs, and
//                          a clarification question on PARTIAL/CLARIFY
//
// Decision Enforcement (handoff §12) is applied AFTER this call as a
// deterministic post-processor — the LLM is not trusted to be the final
// gate. See enforceDecisions.ts.

import type {
  Confidence,
  Importance,
  MatchClassification,
  ReasoningLens,
  RequirementIntent,
  RequirementKind
} from "../types";
import type { ClusterId } from "../knowledge/skillClusters";
import { formatClustersForPrompt } from "../knowledge/skillClusters";
import { formatTransferableRulesForPrompt } from "../knowledge/transferableMappings";

// ---------------------------------------------------------------------------
// Shape of the tool input the model must produce.
// ---------------------------------------------------------------------------

export interface AnalyzeToolInput {
  requirements: AnalyzeReqOut[];
  evidence: AnalyzeEvidenceOut[];
  matches: AnalyzeMatchOut[];
}

export interface AnalyzeReqOut {
  id: string;
  text: string;
  kind: RequirementKind;
  intent: RequirementIntent;
  importance: Importance;
  skillClusters: ClusterId[];
  yearsRequired?: { min?: number; max?: number };
  toolCategory?: string;
}

export interface AnalyzeEvidenceOut {
  id: string;
  source: {
    company?: string;
    title?: string;
    section: "EXPERIENCE" | "EDUCATION" | "SKILLS" | "SUMMARY" | "OTHER";
  };
  text: string;
  skillClusters: ClusterId[];
  toolsNamed: string[];
  dateRange?: {
    start?: string;
    end?: string;
    approximateYears?: number;
  };
}

export interface AnalyzeMatchOut {
  requirementId: string;
  requirementText: string;
  requirementImportance: Importance;
  classification: MatchClassification;
  confidence: Confidence;
  lens: ReasoningLens;
  evidenceIds: string[];
  reasoning: string;
  clarificationQuestion?: string;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const ANALYZE_SYSTEM_LEGACY = `You are a Resume Translation Engine.

Your job is to read a job posting and a resume, and return a structured
analysis of how well the resume proves what the posting asks for.

You are NOT a keyword checker. You think like a thoughtful hiring manager
who knows that:
  • Customer service experience can prove "client-facing" requirements.
  • A sales role can prove "consultative selling," "pipeline ownership,"
    "account growth" — even if the resume uses different words.
  • A candidate with 10 years of relevant work satisfies a "2-3 years"
    requirement, even when the resume doesn't say "2-3 years" anywhere.
  • If the resume doesn't name a specific tool (Salesforce, HubSpot, etc.)
    but clearly used SOMETHING in that category, the right action is to
    CLARIFY with a question, not declare it MISSING.

You think in terms of EVIDENCE and TRANSFERABILITY, not term-matching.

────────────────────────────────────────────────────────────────────────
CLASSIFICATION VOCABULARY
────────────────────────────────────────────────────────────────────────

  MATCH    — the resume clearly proves the requirement. The evidence is
             direct, semantic (synonyms / paraphrases), via cluster
             transfer (e.g., customer service → client relationship
             management), via experience-year math (e.g., 10y > 2-3y),
             or stronger-experience subsumption (managing a team of 10
             includes "experience leading others").

  PARTIAL  — adjacent / weaker evidence. The candidate has done
             something nearby but not the exact thing — e.g., "led
             projects" when the JD asks for "led cross-functional
             initiatives at scale." Provide a clarificationQuestion so
             the candidate can confirm or strengthen it.

  CLARIFY  — the JD names a specific tool, certification, system, or
             measurable outcome that the resume doesn't directly mention,
             but the candidate plausibly has comparable experience.
             Always provide a clarificationQuestion. This is the DEFAULT
             when in doubt — never drop straight to MISSING for a tool
             or cert when transferable category-level evidence exists.

  MISSING  — no plausible trace AND no transferable bridge. Use sparingly.
             Reserved for hard requirements with zero supporting evidence
             (e.g., "Must have valid CDL Class A" when the resume shows
             only office work and no driving roles).

────────────────────────────────────────────────────────────────────────
INTENT VOCABULARY (filter the JD before rating it)
────────────────────────────────────────────────────────────────────────

  MUST_HAVE       — candidate must already have this ("required," "must
                    have," explicit experience floors, certifications).
  PREFERRED       — nice-to-have / asset / bonus.
  RESPONSIBILITY  — what the hire will DO after being hired ("you will
                    prepare meals", "you will respond to tickets"). NOT
                    a candidate prerequisite; do not rate as MISSING.
  TRANSFERABLE    — adjacent capability that can inform tailoring but
                    isn't a hard requirement.
  IGNORE          — company description, benefits, salary, EEO text,
                    culture / mission copy. Filter out — do not include
                    in requirements.

If a JD line is RESPONSIBILITY or TRANSFERABLE and the resume has any
relevant evidence, treat it as MATCH or PARTIAL — never MISSING.

────────────────────────────────────────────────────────────────────────
SEMANTIC CLUSTERS (use these IDs in skillClusters)
────────────────────────────────────────────────────────────────────────

${formatClustersForPrompt()}

────────────────────────────────────────────────────────────────────────
TRANSFERABLE MAPPINGS (cluster bridges)
────────────────────────────────────────────────────────────────────────

${formatTransferableRulesForPrompt()}

────────────────────────────────────────────────────────────────────────
REASONING LENSES (which one fired, set in match.lens)
────────────────────────────────────────────────────────────────────────

  DIRECT             — exact tool/term mentioned in the resume
  SEMANTIC           — synonyms / paraphrases match
  CLUSTER_TRANSFER   — resume cluster bridges to JD cluster via the
                       transferable mappings above
  EXPERIENCE_YEARS   — candidate's aggregated years in the relevant
                       cluster meet the JD floor
  STRONGER_EXPERIENCE— candidate's evidence is more advanced or longer
                       than the JD requirement asks for
  TOOL_CATEGORY      — sibling tool in the same category
  NONE               — no lens fired (used on MISSING)

────────────────────────────────────────────────────────────────────────
OUTPUT RULES
────────────────────────────────────────────────────────────────────────

  • Use stable, deterministic IDs: requirements as "req-1", "req-2", ...,
    evidence as "ev-1", "ev-2", ..., in the order they appear.
  • Every match.requirementId MUST refer to a requirement you returned.
  • Every match.evidenceIds entry MUST refer to evidence you returned.
  • Reasoning must be one plain-English sentence; name the lens you used.
  • PARTIAL and CLARIFY: ALWAYS include a clarificationQuestion.
  • MISSING: clarificationQuestion is optional; reasoning must explain
    why no transferable bridge exists.
  • Never invent tools, certifications, or metrics — only describe what
    the resume actually contains.
  • If the JD has fewer than 5 evaluable requirements (after filtering
    IGNORE), you may still return what's there — quality over quantity.
`;

export const ANALYZE_SYSTEM = `You are a Resume Translation Engine. Return compact structured analysis only.

Goal: compare the resume to the job posting by evidence, not keyword overlap. Do not write or rewrite a resume.

Classifications:
- MATCH: resume proves the requirement directly, semantically, through transferable experience, stronger experience, or enough relevant years.
- PARTIAL: related evidence exists but scope, depth, context, tool, or result is unclear.
- CLARIFY: a specific hard fact may be true but is not shown, such as a named tool, credential, license, metric, or industry fact.
- MISSING: no direct, semantic, transferable, implied, or stronger evidence. Use sparingly.

Intent:
- MUST_HAVE: required candidate qualification.
- PREFERRED: nice-to-have or asset.
- RESPONSIBILITY: duty after hire. Do not mark missing if related evidence exists.
- TRANSFERABLE: useful adjacent capability.
- IGNORE: company copy, benefits, salary, EEO, culture, perks.

Job posting filtering:
- Return requirements only for real qualifications, responsibilities, tools, credentials, education, experience levels, deliverables, workflows, and relevant skills.
- Do NOT create requirements or questions from job metadata: job title, company name, location, employment type, contract duration, salary, reporting manager title, department name, benefits, application instructions, company boilerplate, or equal-opportunity/legal copy.
- Do NOT create requirements or questions from company mission, values, purpose, slogans, employer-branding, or motivational copy.
- Treat lines like "Join EY and help build a better working world", "Join us in our fight...", "People Leader, VP Product", "Full-Time Temporary", and location-only lines as IGNORE, never as requirements.
- Examples to IGNORE: "Full-Time Temporary (15-month Contract)", "Mississauga, Ontario, Canada", "People Leader, VP Product", "Supporter Marketing Specialist", "Join us in our fight to make access to the highest quality hygiene, wellness, and nourishment a right and not a privilege."
- Treat employer/product descriptions as IGNORE, not tool requirements. Example: "RECODemand is a high-growth advertising + software company helping real estate agents and mortgage brokers scale using a proven webinar lead generation system" describes the company/product, not a candidate software requirement.
- If unsure whether a phrase is metadata or a requirement, classify it as IGNORE.
- Clarification questions must be based on real job requirements, not metadata.
- Soft personality phrases may inform framing but must not become standalone questions. Do not ask "Are you organized?", "Are you analytical?", "Are you proactive?", or similar personality confirmation questions. Convert only concrete operational requirements into evidence questions.

Requirement intent interpreter:
- Never turn job posting text directly into a question.
- First infer the hiring intent, then ask what real work evidence would prove it.
- Questions should ask about responsibilities, tools used, workflows managed, projects handled, people or stakeholders coordinated, outcomes improved, documents produced, systems owned, metrics tracked, or problems solved.
- Soft traits must become observable evidence questions: organized -> timelines, documentation, scheduling, follow-up systems; communication -> client calls, presentations, written updates, onboarding materials; analytical -> reports, dashboards, metrics, recommendations; detail-oriented -> quality checks, accuracy review, compliance or brand standards.
- Do not ask "What experience do you have with '[exact job text]'?".
- Do not ask candidates to claim personality traits. Ask what they did, what they owned, what system they used, or what improved.
- Mission, culture, benefits, location, salary, job title, contract type, manager title, company overview, DEI, and application instructions must never appear in clarificationQuestion.
- Explicit hard skills and tools must be preserved as requirements. If the posting says "Facebook Manager Experience", "Facebook Ads Manager", "Meta Ads Manager", "Salesforce", "HubSpot", "Excel", "Google Analytics", "SQL", "Python", "QuickBooks", a license, a credential, or a degree, and the resume does not clearly prove it, return CLARIFY with a direct question before generation.

Hard requirements:
- Licenses, certifications, trade credentials, explicit required degrees, legal eligibility, required driver license, and minimum years are hard requirements.
- Do not translate unrelated office, customer service, or operations work into hard trade credentials or regulated licenses.
- Missing hard requirements should be CLARIFY or MISSING, not MATCH.

Experience-year logic:
- Longer relevant experience satisfies shorter requirements.
- Date ranges and "10+ years" count as evidence.

Allowed cluster IDs:
CLIENT_FACING, ACCOUNT_GROWTH, SALES_ENABLEMENT, PROJECT_MANAGEMENT, PROFITABILITY, CRM_PIPELINE, OPERATIONS, PEOPLE_LEADERSHIP, DATA_ANALYSIS, WRITING_COMMUNICATION, TECHNICAL_SUPPORT.

Common transferable bridges:
- customer service, sales, account management, client communication -> CLIENT_FACING
- sales, account management, lead tracking, follow-up, pipeline -> ACCOUNT_GROWTH or CRM_PIPELINE
- coordinating clients, vendors, timelines, orders, deliverables -> PROJECT_MANAGEMENT or OPERATIONS
- budgets, costs, pricing, margins, scope -> PROFITABILITY
- email, documentation, proposals, templates, FAQs, presentations -> WRITING_COMMUNICATION

Output rules:
- Use IDs req-1, req-2 and ev-1, ev-2 in order.
- Return only important/evaluable requirements, usually 6-12 max. Ignore low-value company copy.
- Keep reasoning to one short sentence.
- Include clarificationQuestion only when useful and direct.
- Questions must ask about the exact missing requirement. Do not ask vague meta-questions.
- Never ask whether the user has done work related to a location, contract type, hiring manager, job title, company overview, benefit, or legal boilerplate item.
- Never ask "Have you done work related to...".
- Never ask "What relevant experience should we emphasize...".
- Never ask personality-only questions. Ask for operational evidence, such as projects coordinated, communications created, tools used, reports built, customers supported, or outcomes improved.
- Never use the phrase "truthful detail".
- Never invent tools, certifications, licenses, degrees, dates, metrics, or employers.`;

// ---------------------------------------------------------------------------
// User prompt
// ---------------------------------------------------------------------------

export function buildAnalyzeUserPrompt(args: {
  resumeText: string;
  jobPostText: string;
}): string {
  return `JOB POSTING
────────────
${args.jobPostText.trim()}

RESUME
────────────
${args.resumeText.trim()}

Now produce the analysis. Call the "submit_analysis" tool with the full
JobRequirement / ResumeEvidence / MatchEvaluation lists.`;
}

// ---------------------------------------------------------------------------
// JSON Schema for the tool input. Keep flat-ish so the SDK round-trips
// reliably. Optional fields use `additionalProperties: false` to fail loud
// if the model adds extras we don't expect.
// ---------------------------------------------------------------------------

const CLUSTER_IDS: ClusterId[] = [
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
];

export const ANALYZE_SCHEMA = {
  toolName: "submit_analysis",
  description:
    "Submit the structured analysis of how the resume matches the job posting.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["requirements", "evidence", "matches"],
    properties: {
      requirements: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "text",
            "kind",
            "intent",
            "importance",
            "skillClusters"
          ],
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            kind: {
              type: "string",
              enum: [
                "TOOL",
                "CERTIFICATION",
                "EXPERIENCE_YEARS",
                "RESPONSIBILITY",
                "INDUSTRY",
                "OUTCOME",
                "SENIORITY",
                "EDUCATION",
                "SOFT_SKILL",
                "OTHER"
              ]
            },
            intent: {
              type: "string",
              enum: [
                "MUST_HAVE",
                "PREFERRED",
                "RESPONSIBILITY",
                "TRANSFERABLE",
                "IGNORE"
              ]
            },
            importance: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
            skillClusters: {
              type: "array",
              items: { type: "string", enum: CLUSTER_IDS }
            },
            yearsRequired: {
              type: "object",
              additionalProperties: false,
              properties: {
                min: { type: "number" },
                max: { type: "number" }
              }
            },
            toolCategory: { type: "string" }
          }
        }
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "source", "text", "skillClusters", "toolsNamed"],
          properties: {
            id: { type: "string" },
            source: {
              type: "object",
              additionalProperties: false,
              required: ["section"],
              properties: {
                company: { type: "string" },
                title: { type: "string" },
                section: {
                  type: "string",
                  enum: [
                    "EXPERIENCE",
                    "EDUCATION",
                    "SKILLS",
                    "SUMMARY",
                    "OTHER"
                  ]
                }
              }
            },
            text: { type: "string" },
            skillClusters: {
              type: "array",
              items: { type: "string", enum: CLUSTER_IDS }
            },
            toolsNamed: {
              type: "array",
              items: { type: "string" }
            },
            dateRange: {
              type: "object",
              additionalProperties: false,
              properties: {
                start: { type: "string" },
                end: { type: "string" },
                approximateYears: { type: "number" }
              }
            }
          }
        }
      },
      matches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "requirementId",
            "requirementText",
            "requirementImportance",
            "classification",
            "confidence",
            "lens",
            "evidenceIds",
            "reasoning"
          ],
          properties: {
            requirementId: { type: "string" },
            requirementText: { type: "string" },
            requirementImportance: {
              type: "string",
              enum: ["HIGH", "MEDIUM", "LOW"]
            },
            classification: {
              type: "string",
              enum: ["MATCH", "PARTIAL", "CLARIFY", "MISSING"]
            },
            confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
            lens: {
              type: "string",
              enum: [
                "DIRECT",
                "SEMANTIC",
                "CLUSTER_TRANSFER",
                "EXPERIENCE_YEARS",
                "STRONGER_EXPERIENCE",
                "TOOL_CATEGORY",
                "NONE"
              ]
            },
            evidenceIds: {
              type: "array",
              items: { type: "string" }
            },
            reasoning: { type: "string" },
            clarificationQuestion: { type: "string" }
          }
        }
      }
    }
  } as Record<string, unknown>
};
