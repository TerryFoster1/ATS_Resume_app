import { sanitizeGeneratedText } from "./sanitizeGeneratedText";
import { BANNED_AI_PHRASES } from "./humanWritingRules";
import { extractSkillItems } from "./skillsSection";
import {
  coverLetterVoiceViolations,
  unsupportedDateViolations,
  type OutputValidationContext
} from "./generatedOutputIntegrity";

export type GeneratedOutputKind = "resume" | "coverLetter";

export type OutputValidationResult = {
  text: string;
  valid: boolean;
  violations: string[];
};

const REQUIRED_RESUME_SECTIONS = [
  "SUMMARY",
  "KEY SKILLS",
  "EXPERIENCE",
  "EDUCATION"
];

const MONTH_PATTERN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

export function validateGeneratedOutput(
  text: string,
  kind: GeneratedOutputKind,
  context?: OutputValidationContext
): OutputValidationResult {
  const sanitized = sanitizeGeneratedText(text);
  const cleaned = kind === "resume" ? normalizeResumeHeadings(sanitized) : sanitized;
  const violations: string[] = [];

  if (/[\u2014\u2015]/.test(cleaned)) {
    violations.push("Contains em dash or horizontal bar punctuation.");
  }

  if (hasDamagedDateRange(cleaned)) {
    violations.push("Contains a damaged date range. Use Jan 2023 - Present, not Jan 2023, Present.");
  }

  const lowered = cleaned.toLowerCase();
  for (const phrase of BANNED_AI_PHRASES) {
    if (lowered.includes(phrase)) {
      violations.push(`Contains banned phrase: ${phrase}`);
    }
  }

  if (kind === "resume") {
    validateResumeStructure(cleaned, violations);
    violations.push(...unsupportedDateViolations(cleaned, context));
  }

  if (kind === "coverLetter") {
    violations.push(...coverLetterVoiceViolations(cleaned, context));
  }

  return {
    text: cleaned,
    valid: violations.length === 0,
    violations
  };
}

export function validationRepairInstruction(
  kind: GeneratedOutputKind,
  violations: string[]
): string {
  const target = kind === "resume" ? "resume" : "cover letter";
  return `Repair the ${target} to fix only these validation issues:
${violations.map((violation) => `- ${violation}`).join("\n")}

Rules for the repair:
- Do not add facts, tools, dates, metrics, employers, schools, credentials, or claims.
- Preserve user-provided evidence and answered follow-up details.
- Do not use em dashes.
- Do not invent dates, years, date ranges, schools, employers, titles, tools, credentials, or claims.
- If repairing a cover letter, write in first person only. Use I, my, and me. Never refer to the candidate by first name or as "the candidate".
- Use standard ATS-safe text, no tables, columns, icons, graphics, headers, or footers.
- If repairing a resume, keep this section order: NAME AND CONTACT, PROFESSIONAL SUMMARY, KEY SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, TOOL STACK only if relevant and supported.
- If repairing resume bullets, keep them truthful and improve them toward action, context, and result without inventing numbers.

Return only the repaired ${target}.`;
}

function validateResumeStructure(text: string, violations: string[]): void {
  const headings = findSectionHeadings(text);
  for (const required of REQUIRED_RESUME_SECTIONS) {
    if (!headings.some((heading) => heading.normalized === required)) {
      violations.push(`Missing required section: ${required}`);
    }
  }

  const order = REQUIRED_RESUME_SECTIONS
    .map((section) => headings.find((heading) => heading.normalized === section)?.index ?? -1)
    .filter((index) => index >= 0);
  if (!isAscending(order)) {
    violations.push("Resume sections are not in the required order: Summary, Key Skills, Professional Experience, Education.");
  }

  const skillsHeading = headings.find((heading) => heading.normalized === "KEY SKILLS");
  if (skillsHeading && skillsHeading.raw.toUpperCase() !== "KEY SKILLS") {
    violations.push("Skills heading must be exactly KEY SKILLS.");
  }

  const summary = sectionText(text, headings, "SUMMARY");
  if (summary) {
    const summaryLines = summary.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const sentences = summary.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length > 4 || summaryLines.length > 4) {
      violations.push("Professional Summary is longer than 4 lines or 4 sentences.");
    }
  }

  const skills = sectionText(text, headings, "KEY SKILLS");
  if (skills) {
    const skillItems = extractSkillItems(skills);
    if (skillItems.length < 6 || skillItems.length > 9) {
      violations.push("Key Skills section must contain 6 to 9 skills.");
    }
    if (skillItems.some(isMalformedSkillPhrase)) {
      violations.push("Key Skills section contains malformed or broken comma phrases.");
    }
  }

  const experience = sectionText(text, headings, "EXPERIENCE");
  if (experience) {
    const repeatedOpeners = repeatedBulletOpeners(experience);
    if (repeatedOpeners.length > 0) {
      violations.push(`Bullets repeat the same opening word too often: ${repeatedOpeners.join(", ")}.`);
    }
    if (hasRoleWithoutOverview(experience)) {
      violations.push("One or more experience roles appear to be missing a one-sentence overview before bullets.");
    }
  }

  const toolStack = headings.find((heading) => heading.normalized === "TOOL STACK");
  if (toolStack) {
    const education = headings.find((heading) => heading.normalized === "EDUCATION");
    if (education && toolStack.index < education.index) {
      violations.push("Tool Stack must appear after Education when included.");
    }
    const tools = sectionText(text, headings, "TOOL STACK");
    if (/\b(various|multiple|standard tools|industry tools|relevant tools)\b/i.test(tools)) {
      violations.push("Tool Stack contains vague or unsupported tool wording.");
    }
  }
}

function normalizeResumeHeadings(text: string): string {
  return text
    .split(/\n/)
    .map((line) => {
      const normalized = normalizeHeading(line);
      if (normalized === "KEY SKILLS") return "KEY SKILLS";
      if (normalized === "EXPERIENCE") return "PROFESSIONAL EXPERIENCE";
      return line;
    })
    .join("\n");
}

function findSectionHeadings(text: string): Array<{ normalized: string; index: number; raw: string }> {
  return text
    .split(/\n/)
    .map((line, index) => ({ raw: line.trim(), index }))
    .filter(({ raw }) => raw.length > 0 && raw.length <= 60)
    .map(({ raw, index }) => ({ raw, index, normalized: normalizeHeading(raw) }))
    .filter(({ normalized }) => Boolean(normalized));
}

function normalizeHeading(raw: string): string {
  const cleaned = raw.replace(/[:]/g, "").trim().toUpperCase();
  if (/^(PROFESSIONAL\s+)?SUMMARY$/.test(cleaned)) return "SUMMARY";
  if (/^(KEY\s+SKILLS|CORE\s+SKILLS|CORE\s+CAPABILITIES|SKILLS|CAPABILITIES|CORE\s+SKILLS\s*\/\s*CAPABILITIES)$/.test(cleaned)) {
    return "KEY SKILLS";
  }
  if (/^PROFESSIONAL\s+EXPERIENCE$|^EXPERIENCE$|^WORK\s+EXPERIENCE$/.test(cleaned)) {
    return "EXPERIENCE";
  }
  if (/^EDUCATION$/.test(cleaned)) return "EDUCATION";
  if (/^TOOL\s+STACK$|^TOOLS$|^TECHNICAL\s+TOOLS$/.test(cleaned)) return "TOOL STACK";
  return "";
}

function sectionText(
  text: string,
  headings: Array<{ normalized: string; index: number; raw: string }>,
  normalized: string
): string {
  const lines = text.split(/\n/);
  const start = headings.find((heading) => heading.normalized === normalized);
  if (!start) return "";
  const next = headings.find((heading) => heading.index > start.index);
  return lines.slice(start.index + 1, next?.index).join("\n").trim();
}

function isMalformedSkillPhrase(skill: string): boolean {
  if (/\b(member|client|customer|stakeholder)\s*,\s*(facing|focused)\b/i.test(skill)) {
    return true;
  }
  if (/^\w+,$/.test(skill)) return true;
  if (skill.split(/\s+/).length === 1 && skill.length < 9) return true;
  return skill.split(/\s+/).length === 1 && skill.includes(",");
}

function repeatedBulletOpeners(experienceText: string): string[] {
  const counts = new Map<string, number>();
  for (const line of experienceText.split(/\n/)) {
    const bullet = line.trim().match(/^[-*•]\s+([A-Za-z]+)/);
    if (!bullet) continue;
    const opener = bullet[1].toLowerCase();
    counts.set(opener, (counts.get(opener) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .map(([opener]) => opener);
}

function hasRoleWithoutOverview(experienceText: string): boolean {
  const lines = experienceText.split(/\n/).map((line) => line.trim());
  for (let index = 0; index < lines.length; index++) {
    if (!looksLikeRoleHeader(lines[index])) continue;
    const following = lines.slice(index + 1, index + 6).filter(Boolean);
    const firstBulletIndex = following.findIndex((line) => /^[-*•]\s+/.test(line));
    if (firstBulletIndex < 0) continue;
    const between = following.slice(0, firstBulletIndex);
    const hasOverview = between.some((line) => !looksLikeRoleMetadata(line) && /[.!?]$/.test(line));
    if (!hasOverview) return true;
  }
  return false;
}

function looksLikeRoleHeader(line: string): boolean {
  if (!line || /^[-*•]\s+/.test(line)) return false;
  if (/^(summary|key skills|professional experience|education|tool stack)$/i.test(line)) return false;
  return /\b(manager|lead|director|specialist|coordinator|consultant|representative|associate|founder|operator|assistant|writer|designer|developer|analyst)\b/i.test(line);
}

function looksLikeRoleMetadata(line: string): boolean {
  if (/\b(19|20)\d{2}\b/.test(line)) return true;
  if (/\s\|\s/.test(line)) return true;
  return line.length < 55 && !/[.!?]$/.test(line);
}

function hasDamagedDateRange(text: string): boolean {
  const monthOrYear = `(?:${MONTH_PATTERN}\\s+\\d{4}|\\d{4})`;
  return new RegExp(`\\b${monthOrYear}\\s*,\\s*(?:${monthOrYear}|present|current)\\b`, "i").test(text);
}

function isAscending(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value > values[index - 1]);
}
