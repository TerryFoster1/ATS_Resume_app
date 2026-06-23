// Cover-letter prompt: short, confident, evidence-driven.

import type { AnalysisResult, FollowUp } from "../types";
import { HUMAN_WRITING_RULES } from "../humanWritingRules";
import { COVER_LETTER_GENERATION_RULES } from "../coverLetterGenerationRules";
import { localePromptInstruction, type WritingLocale } from "../writingLocale";

export const COVER_LETTER_SYSTEM = `You are writing a cover letter on
behalf of a candidate. Three to four short paragraphs, no longer than
350 words.

Voice:
${HUMAN_WRITING_RULES}
${COVER_LETTER_GENERATION_RULES}

Content rules:
  - Only describe experience the candidate actually has, drawing from the resume and any follow-up answers.
  - Never invent metrics, tools, numbers, percentages, revenue, savings, or outcomes.
  - Use follow-up answers as evidence. Convert useful answers into action, context, and impact language.

Output format:
  - Plain text body only. No markdown, no salutation, no signature block. The PDF renderer adds document greeting/date formatting when needed.
  - One blank line between paragraphs.`;

export function buildCoverLetterUserPrompt(args: {
  resumeText: string;
  jobPostText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
  writingLocale?: WritingLocale;
  generationContext?: string;
}): string {
  const narrativeThemes = buildNarrativeThemes(args.analysis).join("\n");

  const followUpAnswers = args.followUps
    .filter((f) => f.answer.trim().length > 0)
    .map((f) => `  - Q: ${f.question}\n    A: ${f.answer}`)
    .join("\n");

  return `JOB POSTING
------------
${args.jobPostText.trim()}

LANGUAGE AND REGIONAL STYLE
------------
${localePromptInstruction(args.writingLocale ?? args.analysis.writingLocale ?? "canadian_uk_english")}

SHARED CAREER GENERATION CONTEXT
------------
${args.generationContext?.trim() || "(no shared CareerGenerationContext provided)"}

CANDIDATE RESUME
------------
${args.resumeText.trim()}

CANDIDATE NARRATIVE THEMES
------------
${narrativeThemes || "- Use the clearest truthful themes from the resume."}

CANDIDATE FOLLOW-UP ANSWERS
------------
${followUpAnswers || "(none provided)"}

Write the cover letter now. Make it sound like a thoughtful candidate, not a requirements checklist. Plain text only.`;
}

function buildNarrativeThemes(analysis: AnalysisResult): string[] {
  const text = [
    ...analysis.buckets.strengths.map((match) => match.requirementText),
    ...analysis.buckets.partials.map((match) => match.requirementText)
  ]
    .join(" ")
    .toLowerCase();

  const themes: string[] = [];
  addTheme(themes, text, /\b(client|customer|onboard|support|follow|relationship|retention)\b/, "client communication, follow-through, and relationship support");
  addTheme(themes, text, /\b(marketing|campaign|brand|content|social|meta|facebook|digital)\b/, "marketing systems, content, and campaign execution");
  addTheme(themes, text, /\b(report|analytics|dashboard|kpi|performance|data|metric)\b/, "reporting, performance tracking, and practical use of data");
  addTheme(themes, text, /\b(operation|process|workflow|documentation|crm|system|coordinate)\b/, "operations, documentation, workflow discipline, and keeping work organized");
  addTheme(themes, text, /\b(strategy|insight|research|market|audience|consumer)\b/, "audience insight, strategy, and translating information into clearer decisions");
  addTheme(themes, text, /\b(write|communication|presentation|training|guide|email)\b/, "clear written communication, training, and stakeholder updates");

  return themes.slice(0, 5).map((theme) => `- ${theme}`);
}

function addTheme(themes: string[], text: string, pattern: RegExp, theme: string): void {
  if (pattern.test(text) && !themes.includes(theme)) {
    themes.push(theme);
  }
}

