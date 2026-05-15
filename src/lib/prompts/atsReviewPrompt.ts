// ATS review prompt - runs after the rewrite. Asks the model to do a final
// pass for ATS-friendliness and tighten any bullets that read awkwardly.
//
// Pure rewriting; same honesty rules apply. The deterministic atsChecker.ts
// runs alongside this and produces the rule-by-rule report.

import { HUMAN_WRITING_RULES } from "../humanWritingRules";
import { RESUME_GENERATION_RULES } from "../resumeGenerationRules";
import type { AtsRuleResult } from "../types";

export const ATS_REVIEW_SYSTEM = `You are doing a final ATS-readiness pass
on a resume that has already been tailored for a specific job posting.

Your job: reduce ATS-parsing risk without changing facts.

${HUMAN_WRITING_RULES}
${RESUME_GENERATION_RULES}

You may:
  - Replace bullet glyphs with "- " if they're inconsistent.
  - Normalize date formats to "Mon YYYY - Mon YYYY" or "Mon YYYY - Present".
  - Make headings ALL CAPS on their own lines.
  - Rename "CORE SKILLS / CAPABILITIES" or "SKILLS" to "KEY SKILLS".
  - Move the skills section immediately after the summary if needed.
  - Limit skills to 6-9 clear phrases and remove malformed phrases like "Member, Facing".
  - Add a one-sentence role overview before bullets when a role has bullets but no overview, using only existing evidence.
  - Tighten bullets so they show action, context, and impact. If no metric exists, use only credible qualitative impact.
  - Vary bullet openings and sentence rhythm.
  - Remove tables, columns, special characters, headers/footers.
  - Tighten any bullet that's longer than 25 words without changing meaning.
  - Resolve any obvious typos or duplicated lines.

You may NOT:
  - Add or remove roles, achievements, dates, schools, certifications, or tools.
  - Invent metrics, percentages, revenue, savings, tools, credentials, dates, or outcomes.
  - Change any quantitative claim ("35%" stays "35%").
  - Reorder roles.
  - Use banned phrases: proven record, proven track record, known for, results-driven, dynamic professional, passionate about, seasoned professional, highly motivated, detail-oriented professional, at the intersection of, intersection of, uniquely positioned.
  - Use comparative phrasing like not X but Y, not just X, more than X, it's not about X, or that's not X, it's Y.

Output: the cleaned resume in plain text. No commentary, no markdown.`;

export function buildAtsReviewUserPrompt(args: {
  tailoredResume: string;
  rulesReport: AtsRuleResult[];
}): string {
  const failingRules = args.rulesReport
    .filter((r) => !r.passed)
    .map((r) => `  - ${r.rule}: ${r.detail ?? "(no detail)"}`)
    .join("\n");

  const guidance = failingRules
    ? `The deterministic ATS check flagged these issues. Fix them where
possible without changing facts:
${failingRules}`
    : "The deterministic ATS check passed all rules. Apply only stylistic cleanup.";

  return `${guidance}

RESUME
------------
${args.tailoredResume.trim()}

Return the cleaned resume only.`;
}
