import type { FollowUp } from "./types";

const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const YEAR_TEST_RE = /\b(?:19|20)\d{2}\b/;
const EDUCATION_DATE_RE =
  /\s*(?:\|\s*)?(?:graduated|completed|completion year|class of)?\s*(?:in\s*)?(?:19|20)\d{2}\b/gi;
const ROLE_DATE_RE =
  /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\s+-\s+(?:present|current|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2})\b/gi;

export type OutputValidationContext = {
  sourceResumeText?: string;
  followUps?: FollowUp[];
  candidateName?: string;
};

export function candidateNameFromResume(resumeText: string): string | undefined {
  return resumeText
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 1 && !/@|https?:\/\/|linkedin\.com|\d{3}/i.test(line));
}

export function firstName(candidateName?: string): string | undefined {
  return candidateName?.trim().split(/\s+/)[0];
}

export function coverLetterVoiceViolations(
  text: string,
  context?: OutputValidationContext
): string[] {
  const violations: string[] = [];
  const first = firstName(context?.candidateName);
  if (!/\b(I|my|me|I've|I'm|I'd|I'll)\b/i.test(text)) {
    violations.push("Cover letter must be written in first person.");
  }
  if (/\b(the candidate|this candidate)\b/i.test(text)) {
    violations.push("Cover letter refers to the candidate in third person.");
  }
  if (first) {
    const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const thirdPerson = new RegExp(
      `\\b${escaped}(?:'s)?\\b\\s+(?:background|experience|work|brings|would|has|is|can|offers|provides|combines|understands|works|supports|creates|helps)\\b`,
      "i"
    );
    if (thirdPerson.test(text)) {
      violations.push(`Cover letter refers to ${first} in third person.`);
    }
  }
  return violations;
}

export function unsupportedDateViolations(
  generatedResume: string,
  context?: OutputValidationContext
): string[] {
  if (!context?.sourceResumeText) return [];
  const violations: string[] = [];
  const allowedYears = allowedYearSet(context);
  const generatedYears = new Set(generatedResume.match(YEAR_RE) ?? []);
  const unsupported = [...generatedYears].filter((year) => !allowedYears.has(year));
  if (unsupported.length > 0) {
    violations.push(`Generated unsupported date/year: ${unsupported.join(", ")}.`);
  }

  if (!educationSourceHasAnyYear(context.sourceResumeText, context.followUps ?? [])) {
    const education = sectionText(generatedResume, "education");
    if (education && YEAR_TEST_RE.test(education)) {
      violations.push("Generated education date/year that was not present in the source resume or answers.");
    }
  }

  return violations;
}

export function removeUnsupportedResumeDates(
  generatedResume: string,
  context: OutputValidationContext
): string {
  if (!context.sourceResumeText) return generatedResume;
  const allowedYears = allowedYearSet(context);
  const sourceHasEducationYear = educationSourceHasAnyYear(
    context.sourceResumeText,
    context.followUps ?? []
  );

  return rewriteSections(generatedResume, (heading, body) => {
    if (heading === "EDUCATION" && !sourceHasEducationYear) {
      return body
        .split("\n")
        .map((line) => cleanLineAfterDateRemoval(line.replace(EDUCATION_DATE_RE, "")))
        .join("\n");
    }

    return body
      .split("\n")
      .map((line) => {
        const ranges = line.match(ROLE_DATE_RE) ?? [];
        let next = line;
        for (const range of ranges) {
          const years = range.match(YEAR_RE) ?? [];
          if (years.some((year) => !allowedYears.has(year))) {
            next = next.replace(range, "");
          }
        }
        return cleanLineAfterDateRemoval(next);
      })
      .join("\n");
  });
}

export function consolidateOverlappingSameCompanyRoles(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  const seenCompanyDate = new Map<string, number>();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const next = lines[index + 1];
    if (looksLikeRoleTitle(line) && next) {
      const meta = parseCompanyDateMeta(next);
      if (meta) {
        const key = `${meta.company.toLowerCase()}::${meta.dateRange.toLowerCase()}`;
        const previousTitleIndex = seenCompanyDate.get(key);
        if (previousTitleIndex !== undefined) {
          output[previousTitleIndex] = mergeRoleTitles(output[previousTitleIndex], line);
          index += 1;
          continue;
        }
        seenCompanyDate.set(key, output.length);
      }
    }
    output.push(line);
  }

  return output.join("\n");
}

function allowedYearSet(context: OutputValidationContext): Set<string> {
  return new Set(
    `${context.sourceResumeText ?? ""}\n${(context.followUps ?? [])
      .map((followUp) => followUp.answer)
      .join("\n")}`.match(YEAR_RE) ?? []
  );
}

function educationSourceHasAnyYear(sourceResumeText: string, followUps: FollowUp[]): boolean {
  const sourceEducation = sectionText(sourceResumeText, "education");
  const answerText = followUps.map((followUp) => followUp.answer).join("\n");
  return YEAR_TEST_RE.test(`${sourceEducation}\n${answerText}`);
}

function sectionText(text: string, section: "education"): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => /^education\s*:?\s*$/i.test(line.trim()));
  if (start === -1) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (/^[A-Z][A-Z\s/&-]{2,}:?$/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function rewriteSections(
  text: string,
  transform: (heading: string, body: string) => string
): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const heading = normalizedHeading(lines[index]);
    if (!heading) {
      out.push(lines[index]);
      continue;
    }
    let end = lines.length;
    for (let next = index + 1; next < lines.length; next++) {
      if (normalizedHeading(lines[next])) {
        end = next;
        break;
      }
    }
    out.push(lines[index]);
    out.push(transform(heading, lines.slice(index + 1, end).join("\n")));
    index = end - 1;
  }
  return out.join("\n");
}

function normalizedHeading(line: string): string {
  const trimmed = line.trim().replace(/:$/, "").toUpperCase();
  if (/^(PROFESSIONAL\s+)?SUMMARY$/.test(trimmed)) return "SUMMARY";
  if (/^KEY\s+SKILLS$/.test(trimmed)) return "KEY SKILLS";
  if (/^(PROFESSIONAL\s+)?EXPERIENCE$/.test(trimmed)) return "PROFESSIONAL EXPERIENCE";
  if (/^EDUCATION$/.test(trimmed)) return "EDUCATION";
  if (/^(TOOL\s+STACK|TECHNICAL\s+SKILLS)$/.test(trimmed)) return trimmed;
  return "";
}

function cleanLineAfterDateRemoval(line: string): string {
  return line
    .replace(/\s+\|\s*$/g, "")
    .replace(/\|\s*\|/g, "|")
    .replace(/\s{2,}/g, " ")
    .trimEnd();
}

function looksLikeRoleTitle(line: string): boolean {
  return /\b(?:lead|founder|producer|manager|specialist|coordinator|consultant|director|assistant|associate|operator|representative)\b/i.test(
    line
  );
}

function parseCompanyDateMeta(line: string): { company: string; dateRange: string } | null {
  const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
  const datePart = parts.find((part) => ROLE_DATE_RE.test(part));
  ROLE_DATE_RE.lastIndex = 0;
  if (!datePart || parts.length < 2) return null;
  return { company: parts[0], dateRange: datePart };
}

function mergeRoleTitles(existing: string, next: string): string {
  const existingParts = existing.split(/\s*(?:,|\/| and )\s*/i).map((part) => part.trim());
  const nextParts = next.split(/\s*(?:,|\/| and )\s*/i).map((part) => part.trim());
  const merged = [...existingParts, ...nextParts].filter(Boolean);
  const unique = [...new Set(merged)];
  if (unique.length <= 1) return existing;
  return unique.join(" and ");
}
