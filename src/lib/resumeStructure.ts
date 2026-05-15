export type ResumeSectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "tools";

export type DetectedRole = {
  header: string;
  title?: string;
  company?: string;
  location?: string;
  dateRange?: string;
  bullets: string[];
  hasBullets: boolean;
  descriptionLineCount: number;
  hasDescriptions: boolean;
};

export type StructuredResume = {
  roles: DetectedRole[];
  education: string[];
  skills: string[];
};

export type ResumeStructureDiagnostics = {
  sections: Record<ResumeSectionKey, boolean>;
  sectionText: Partial<Record<ResumeSectionKey, string>>;
  sectionLineRanges: Partial<Record<ResumeSectionKey, { start: number; end: number }>>;
  dateRanges: string[];
  roles: DetectedRole[];
  education: string[];
  skills: string[];
  structured: StructuredResume;
};

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const YEAR = "(?:19|20)\\d{2}";
const DATE_TOKEN = `(?:${MONTH}\\.?\\s+${YEAR}|(?:0?[1-9]|1[0-2])\\/${YEAR}|${YEAR})`;
export const DATE_RANGE_PATTERN = `${DATE_TOKEN}\\s*(?:-|\\u2013|\\u2014|to)\\s*(?:${DATE_TOKEN}|Present|Current)`;

const KNOWN_HEADING_PATTERNS: Array<{
  key: ResumeSectionKey;
  pattern: RegExp;
}> = [
  { key: "summary", pattern: /^(?:professional\s+)?summary|profile$/i },
  {
    key: "skills",
    pattern:
      /^(?:key\s+skills|skills|core\s+skills|core\s+capabilities|technical\s+skills|competencies)$/i
  },
  {
    key: "experience",
    pattern:
      /^(?:professional\s+experience|experience|work\s+experience|employment\s+history|employment|work\s+history|additional\s+experience)$/i
  },
  { key: "education", pattern: /^(?:education|academic\s+background)$/i },
  { key: "tools", pattern: /^(?:tool\s+stack|tools|technical\s+tools)$/i }
];

export function inspectResumeStructure(text: string): ResumeStructureDiagnostics {
  const fullText = mergeFullDocumentText(text);
  const lines = fullText.split("\n");
  const sections: Record<ResumeSectionKey, boolean> = {
    summary: false,
    skills: false,
    experience: false,
    education: false,
    tools: false
  };
  const sectionText: Partial<Record<ResumeSectionKey, string>> = {};
  const sectionLineRanges: Partial<Record<ResumeSectionKey, { start: number; end: number }>> = {};

  for (const key of Object.keys(sections) as ResumeSectionKey[]) {
    const section = sliceKnownSection(lines, key);
    if (section) {
      sections[key] = true;
      sectionText[key] = section.text;
      sectionLineRanges[key] = { start: section.start, end: section.end };
    }
  }

  const roles = detectRoles(sectionText.experience ?? fullText);
  const education = detectEducationEntries(sectionText.education ?? fullText);
  const skills = detectSkillEntries(sectionText.skills ?? "");
  if (!sections.education && education.length > 0) {
    sections.education = true;
    sectionText.education = education.join("\n");
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[resume-structure-parser]", {
      roles: roles.map((role) => ({
        title: role.title,
        company: role.company,
        dateRange: role.dateRange,
        bulletCount: role.bullets.length,
        descriptionLineCount: role.descriptionLineCount,
        missingDescriptionReason: role.hasDescriptions ? "" : "No bullet, action, or paragraph description lines detected under this role."
      })),
      detectedSectionHeadings: Object.entries(sections)
        .filter(([, present]) => present)
        .map(([key]) => ({ key, range: sectionLineRanges[key as ResumeSectionKey] })),
      education,
      skills: skills.slice(0, 12)
    });
  }

  return {
    sections,
    sectionText,
    sectionLineRanges,
    dateRanges: getDateRanges(fullText),
    roles,
    education,
    skills,
    structured: {
      roles,
      education,
      skills
    }
  };
}

export function getDateRanges(text: string): string[] {
  const regex = new RegExp(DATE_RANGE_PATTERN, "gi");
  return [...text.matchAll(regex)]
    .map((match) => normalizeDateRangeText(match[0]))
    .filter(Boolean);
}

export function hasDateRange(text: string): boolean {
  return new RegExp(DATE_RANGE_PATTERN, "i").test(text);
}

export function normalizeHeadingText(line: string): string {
  return line
    .replace(/^[\s#>*-]+/, "")
    .replace(/[:.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function headingKeyForLine(line: string): ResumeSectionKey | null {
  const normalized = normalizeHeadingText(line);
  if (!normalized || normalized.length > 60) return null;
  const match = KNOWN_HEADING_PATTERNS.find((candidate) =>
    candidate.pattern.test(normalized)
  );
  return match?.key ?? null;
}

function sliceKnownSection(
  lines: string[],
  key: ResumeSectionKey
): { text: string; start: number; end: number } | null {
  const start = lines.findIndex((line) => headingKeyForLine(line) === key);
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (headingKeyForLine(lines[index])) {
      end = index;
      break;
    }
  }
  return { text: lines.slice(start + 1, end).join("\n").trim(), start, end };
}

function detectRoles(sourceText: string): DetectedRole[] {
  if (!sourceText.trim()) return [];
  const lines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const roles: DetectedRole[] = [];

  let index = 0;
  while (index < lines.length) {
    const parsed = parseRoleHeader(lines, index);
    if (!parsed) {
      index++;
      continue;
    }

    const nextRoleIndex = findNextRoleIndex(lines, parsed.nextIndex);
    const roleBlock = lines.slice(parsed.nextIndex, nextRoleIndex);
    const bullets = mergeBulletLines(roleBlock);
    const descriptionLineCount = roleBlock.filter(isDescriptionLine).length;
    roles.push({
      header: parsed.header,
      title: parsed.title,
      company: parsed.company,
      location: parsed.location,
      dateRange: parsed.dateRange,
      bullets,
      hasBullets: bullets.length > 0,
      descriptionLineCount,
      hasDescriptions: bullets.length > 0 || descriptionLineCount > 0
    });
    index = Math.max(nextRoleIndex, parsed.nextIndex + 1);
  }

  return dedupeRoles(roles);
}

function parseRoleHeader(
  lines: string[],
  index: number
): {
  header: string;
  title?: string;
  company?: string;
  location?: string;
  dateRange?: string;
  nextIndex: number;
} | null {
  const line = lines[index];
  if (isBulletLike(line) || headingKeyForLine(line)) return null;

  const next = lines[index + 1];
  const combined = [line, next].filter(Boolean).join(" ");
  const dateRange = firstDateRange(combined);
  if (!dateRange) return null;

  if (
    next &&
    firstDateRange(next) &&
    !firstDateRange(line) &&
    looksLikeRoleTitle(line) &&
    looksLikeCompanyDateLine(next)
  ) {
    const meta = parseCompanyLocationDateLine(next);
    return {
      header: `${line} | ${next}`,
      title: cleanRoleText(line),
      company: meta.company,
      location: meta.location,
      dateRange,
      nextIndex: index + 2
    };
  }

  if (!firstDateRange(line) || !looksLikeSingleLineRole(line)) return null;
  const sameLine = parseSingleLineRole(line);
  return {
    header: line,
    title: sameLine.title,
    company: sameLine.company,
    location: sameLine.location,
    dateRange,
    nextIndex: index + 1
  };
}

function parseCompanyLocationDateLine(line: string): {
  company?: string;
  location?: string;
} {
  const withoutDate = line.replace(new RegExp(DATE_RANGE_PATTERN, "i"), "");
  const parts = splitRoleParts(withoutDate);
  return {
    company: parts[0],
    location: parts[1]
  };
}

function parseSingleLineRole(line: string): {
  title?: string;
  company?: string;
  location?: string;
} {
  const withoutDate = line.replace(new RegExp(DATE_RANGE_PATTERN, "i"), "");
  const parts = splitRoleParts(withoutDate);
  return {
    title: parts[0],
    company: parts[1],
    location: parts[2]
  };
}

function splitRoleParts(value: string): string[] {
  return value
    .split(/\s*(?:\||-|\u2013|\u2014)\s*/)
    .map(cleanRoleText)
    .filter(Boolean);
}

function findNextRoleIndex(lines: string[], start: number): number {
  for (let index = start; index < lines.length; index++) {
    if (parseRoleHeader(lines, index)) return index;
  }
  return lines.length;
}

function firstDateRange(text: string): string | undefined {
  const match = text.match(new RegExp(DATE_RANGE_PATTERN, "i"));
  return match ? normalizeDateRangeText(match[0]) : undefined;
}

function mergeBulletLines(lines: string[]): string[] {
  const bullets: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || headingKeyForLine(line)) continue;
    if (isBulletLike(line)) {
      bullets.push(stripBulletMarker(line));
      continue;
    }
    if (bullets.length > 0 && isWrappedBulletLine(line)) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${line}`
        .replace(/\s+/g, " ")
        .trim();
      continue;
    }
    if (isDescriptionLine(line)) {
      bullets.push(line.replace(/\s+/g, " ").trim());
    }
  }
  return bullets.filter(Boolean);
}

function isBulletLike(line: string): boolean {
  return /^\s*(?:[-*]|\u2022|\u25cf|\u25aa|\u00b7|Ã¢â‚¬Â¢|\d+[.)])\s+/.test(line);
}

function stripBulletMarker(line: string): string {
  return line
    .replace(/^\s*(?:[-*]|\u2022|\u25cf|\u25aa|\u00b7|Ã¢â‚¬Â¢|\d+[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isWrappedBulletLine(line: string): boolean {
  if (hasDateRange(line) || headingKeyForLine(line)) return false;
  if (/^[A-Z][A-Z\s/&-]{3,}$/.test(line)) return false;
  return line.length > 0;
}

function isDescriptionLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || headingKeyForLine(trimmed)) return false;
  if (isBulletLike(trimmed)) return true;
  if (hasDateRange(trimmed)) return false;
  if (looksLikeCompanyLine(trimmed)) return false;
  if (/^[A-Z][A-Z\s/&-]{3,}$/.test(trimmed)) return false;
  return /[.!?]$/.test(trimmed) || hasActionVerb(trimmed) || trimmed.length >= 24;
}

function looksLikeRoleTitle(line: string): boolean {
  const cleaned = cleanRoleText(line);
  if (!cleaned || cleaned.length > 90) return false;
  if (hasActionVerb(cleaned) && /[.!?]$/.test(cleaned)) return false;
  if (looksLikeCompanyLine(cleaned)) return false;
  return /\b(?:manager|lead|specialist|coordinator|consultant|representative|associate|assistant|director|founder|operator|analyst|designer|writer|developer|advisor|supervisor|customer|success|operations|marketing|communications?|content|sales|service)\b/i.test(cleaned);
}

function looksLikeCompanyDateLine(line: string): boolean {
  return hasDateRange(line) && looksLikeCompanyLine(line.replace(new RegExp(DATE_RANGE_PATTERN, "i"), ""));
}

function looksLikeSingleLineRole(line: string): boolean {
  if (!hasDateRange(line)) return false;
  const withoutDate = line.replace(new RegExp(DATE_RANGE_PATTERN, "i"), "");
  return /(\s\|\s|\s-\s|\s\u2013\s|\s\u2014\s)/.test(withoutDate) && splitRoleParts(withoutDate).length >= 2;
}

function looksLikeCompanyLine(line: string): boolean {
  const cleaned = cleanRoleText(line);
  if (!cleaned) return false;
  if (/@|https?:\/\/|www\.|linkedin\.com/i.test(cleaned)) return false;
  if (/[.!?]$/.test(cleaned) && cleaned.split(/\s+/).length > 7) return false;
  return /^[A-Z0-9][A-Za-z0-9&.'()/,\s-]{1,80}$/.test(cleaned);
}

function hasActionVerb(line: string): boolean {
  return /\b(?:managed|manage|led|lead|developed|develop|coordinated|coordinate|created|create|supported|support|maintained|maintain|wrote|write|built|build|delivered|deliver|reviewed|review|implemented|implement|improved|improve|tracked|track|organized|organize|prepared|prepare|handled|handle|resolved|resolve|communicated|communicate|collaborated|collaborate|trained|train|designed|design|produced|produce|oversaw|oversee|analyzed|analyze|reported|report)\b/i.test(line);
}

function detectEducationEntries(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isEducationEntityLine)
    .filter((line) => educationEvidenceRe().test(line))
    .map((line) => line.replace(/\s+/g, " ").trim());
}

function isEducationEntityLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isBulletLike(trimmed)) return false;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/\b(award|awards|scholarship|scholarships|dean'?s list|distinction|honou?rs?|honors?|recognition|achievement|gpa)\b/i.test(trimmed)) {
    return false;
  }
  if (/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length > 5) return false;
  if (hasActionVerb(trimmed)) return false;
  return true;
}

function detectSkillEntries(text: string): string[] {
  return text
    .split(/[\n,;\u2022\u25cf*-]+/)
    .map((skill) => skill.replace(/\s+/g, " ").trim())
    .filter((skill) => skill.length > 1 && skill.length <= 80);
}

function educationEvidenceRe(): RegExp {
  return /\b(?:Bachelor|Master|Associate|Diploma|Certificate|Degree|Post[-\s]?Graduate|Journalism|Multimedia|Communications?|Media|Marketing|Social\s+Media|Conestoga\s+College|University|College|Institute|School|Academy)\b/i;
}

function cleanRoleText(value: string): string {
  return value
    .replace(new RegExp(DATE_RANGE_PATTERN, "i"), "")
    .replace(/\s+/g, " ")
    .replace(/^[|,\-\s]+|[|,\-\s]+$/g, "")
    .trim();
}

function mergeFullDocumentText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/\n\s*(?:Page\s+\d+(?:\s+of\s+\d+)?)\s*\n/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDateRangeText(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\bto\b/gi, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeRoles(roles: DetectedRole[]): DetectedRole[] {
  const seen = new Set<string>();
  return roles.filter((role) => {
    const key = `${role.header}|${role.dateRange}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
