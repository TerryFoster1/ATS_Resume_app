// Rewrite prompt: produces an honest, tailored resume in plain text.

import type { AnalysisResult, FollowUp, ResumeStrategy } from "../types";
import { deriveJdKeywords } from "../jdKeywords";
import { HUMAN_WRITING_RULES } from "../humanWritingRules";
import { RESUME_GENERATION_RULES } from "../resumeGenerationRules";
import { localePromptInstruction, type WritingLocale } from "../writingLocale";

export const REWRITE_SYSTEM = `You are an automated resume tailoring engine.

Your job is to decide what belongs in the tailored resume, rewrite the selected experience for the target job, and produce a clean ATS-friendly resume. The candidate should not have to choose what to include.

Core operating rules:
- Decide relevance automatically. Do not ask the user to choose bullets, roles,
  skills, or sections.
- Select the strongest truthful evidence for the job posting.
- Drop irrelevant roles, bullets, skills, and tools when they do not help this
  target role.
- Keep every selected role as its own entry. Never merge roles, employers, or
  date ranges.
- Do not invent employers, titles, dates, schools, credentials, certifications,
  tools, responsibilities, metrics, percentages, revenue, savings, or growth.
- User follow-up answers are raw material, not final wording. Convert them into
  natural resume language and insert them into the correct role.
- You MUST use every relevant user-provided follow-up answer. The generated
  resume is invalid if a useful answer is not reflected in SUMMARY, EXPERIENCE,
  EDUCATION, SKILLS, or TOOL STACK.

${HUMAN_WRITING_RULES}
${RESUME_GENERATION_RULES}
- Include important supported keywords from the job posting only when truthful and natural.
- Do not explain that something aligns with the role.
- Do not say "as required by the role" or similar meta language.

ATS-critical field patches:
- If the original resume contains an "ATS-CRITICAL FIELD PATCHES" block, those
  patches are confirmed candidate facts.
- Apply each patch to the matching EDUCATION or EXPERIENCE entry.
- Do not leave patch text as a separate note.
- Do not create duplicate entries for patched facts.

Role integrity:
- One employer, one official title, and one date range per experience entry.
- If the input contains multiple roles or companies, split them into separate
  entries.
- Never output a combined line like "Role A / Role B at Company A / Company B".

Output format:
- Plain text only. No markdown fences, no tables, no columns.
- Headings on their own lines in ALL CAPS.
- Use standard hyphen bullets or simple bullet characters.
- One blank line between sections.
- Date format should be clear and consistent, such as "Jan 2021 - Mar 2024" or
  "2021 - Present".`;

export function buildRewriteUserPrompt(args: {
  resumeText: string;
  jobPostText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
  strategy?: ResumeStrategy;
  writingLocale?: WritingLocale;
}): string {
  const answeredFollowUps = args.followUps.filter((f) => f.answer.trim().length > 0);
  const followUpBlock = answeredFollowUps.length
    ? answeredFollowUps
        .map(
          (f, i) =>
            `Q${i + 1}: ${f.question.trim()}\nA${i + 1}: ${f.answer.trim()}`
        )
        .join("\n\n")
    : "(no candidate answers provided)";

  const strategyBlock = args.strategy
    ? `AUTOMATED RESUME STRATEGY
Summary direction: ${args.strategy.summary}

Role positioning to apply when truthful:
${args.strategy.subtitles
  .map((s) => `- ${s.company} | ${s.title}: ${s.subtitle}`)
  .join("\n")}

Evidence clusters to prioritize:
${args.strategy.surfacedSkills.map((s) => `- ${s}`).join("\n")}`
    : "(no precomputed strategy; derive selection from the analysis below)";

  const jdKeywords = deriveJdKeywords(args.analysis.requirements);
  const keywordBlock =
    jdKeywords.required.length || jdKeywords.preferred.length
      ? `Required supported keywords to include when truthful:
${jdKeywords.required.map((kw) => `- ${kw}`).join("\n") || "- (none)"}

Preferred supported keywords:
${jdKeywords.preferred.map((kw) => `- ${kw}`).join("\n") || "- (none)"}`
      : "(no ATS keyword guidance extracted)";

  const supportedAlignment = args.analysis.matches
    .filter((match) => match.classification === "MATCH" || match.classification === "PARTIAL")
    .slice(0, 10)
    .map((match) => `- ${match.requirementText}`)
    .join("\n");

  const weakHardSkills = (args.analysis.requirementConfidence ?? [])
    .filter(
      (item) =>
        item.questionNeeded &&
        item.evidenceConfidence < 0.5 &&
        (item.category === "TOOL" ||
          item.category === "CERTIFICATION" ||
          item.category === "EDUCATION" ||
          item.category === "EXPERIENCE_YEARS")
    )
    .slice(0, 6)
    .map((item) => `- ${item.requirementText}`)
    .join("\n");

  return `JOB POSTING
------------
${args.jobPostText.trim()}

LANGUAGE AND REGIONAL STYLE
------------
${localePromptInstruction(args.writingLocale ?? args.analysis.writingLocale ?? "canadian_uk_english")}

ORIGINAL RESUME AND CONFIRMED CONTEXT
------------
${args.resumeText.trim()}

SUPPORTED ALIGNMENT TO EMPHASIZE
------------
${supportedAlignment || "(use the strongest truthful evidence from the resume)"}

WEAK OR UNCONFIRMED HARD-SKILL GAPS, HANDLE HONESTLY
------------
${weakHardSkills || "(none flagged)"}

ANSWERED REQUIREMENT EVIDENCE, MUST BE USED WHEN RELEVANT
------------
${followUpBlock}

ATS KEYWORD GUIDANCE
------------
${keywordBlock}

${strategyBlock}

Now produce the tailored resume only. Make the inclusion decisions yourself.
Use the strongest truthful content, transform candidate answers into polished
resume bullets with action, context, and impact, and omit content that does not
help this target job.`;
}
