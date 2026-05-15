// Internal ATS-style checker. Honest: validates our own rules only.
// Not a simulation of any real ATS.
// Rules documented in docs/spec.md.

import type { AtsRuleResult, JdKeywords } from "./types";
import { inspectResumeStructure } from "./resumeStructure";

export const KEYWORD_COVERAGE_THRESHOLD = 0.7;
export const MAX_RESUME_WORDS = 800;
export const MAX_COVER_LETTER_WORDS = 400;

export interface CheckerInput {
  resume: string;
  coverLetter: string;
  jdKeywords: JdKeywords;
}

export function runAtsChecks(input: CheckerInput): AtsRuleResult[] {
  const { resume, coverLetter, jdKeywords } = input;
  return [
    ruleStandardHeadings(resume),
    ruleCleanDates(resume),
    ruleNoExoticStructure(resume, coverLetter),
    ruleKeywordCoverage(resume, jdKeywords),
    ruleParseableWorkHistory(resume),
    ruleParseableEducation(resume),
    ruleParseableSkills(resume),
    ruleAtsFriendlyFormatting(resume, coverLetter),
    ruleLengthSanity(resume, coverLetter)
  ];
}

export function allPassed(report: AtsRuleResult[]): boolean {
  return report.length > 0 && report.every((r) => r.passed);
}

export function runResumeStructureChecks(resume: string): AtsRuleResult[] {
  return [
    ruleStandardHeadings(resume),
    ruleCleanDates(resume),
    ruleParseableWorkHistory(resume),
    ruleParseableEducation(resume),
    ruleParseableSkills(resume)
  ];
}

// --- rule 1: standard section headings ---------------------------------------

const REQUIRED_HEADING_GROUPS: { label: string; patterns: RegExp[] }[] = [
  {
    label: "Experience",
    patterns: [/^\s*(work\s+)?experience\s*$/im, /^\s*employment(\s+history)?\s*$/im, /^\s*work\s+history\s*$/im, /^\s*professional\s+experience\s*$/im]
  },
  {
    label: "Education",
    patterns: [/^\s*education\s*$/im, /^\s*academic\s+background\s*$/im]
  },
  {
    label: "Skills",
    patterns: [/^\s*(technical\s+|core\s+)?skills\s*$/im, /^\s*competencies\s*$/im]
  }
];

function ruleStandardHeadings(resume: string): AtsRuleResult {
  const structure = inspectResumeStructure(resume);
  const missing: string[] = [];
  if (!structure.sections.experience) missing.push("Experience");
  if (!structure.sections.education) missing.push("Education");
  if (!structure.sections.skills) missing.push("Skills");
  return {
    rule: "Standard section headings present",
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? "Experience, Education, and Skills headings found."
        : `Missing: ${missing.join(", ")}.`
  };
}

// --- rule 2: clean date formatting -------------------------------------------

// Accept patterns like:
//   Jan 2021 – Mar 2023
//   January 2021 – Present
//   01/2021 – 03/2023
//   2021 – 2023
// Reject things like "2021ish", "circa 2020", bare "2021".
const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)";
const YEAR = "(?:19|20)\\d{2}";
const DATE_TOKEN = `(?:${MONTH}\\.?\\s+${YEAR}|(?:0?[1-9]|1[0-2])\\/${YEAR}|${YEAR})`;
const DATE_RANGE_RE = new RegExp(
  `${DATE_TOKEN}\\s*(?:-|–|—|â€“|â€”|to)\\s*(?:${DATE_TOKEN}|Present|Current)`,
  "gi"
);
const SUSPECT_DATE_RE = /\b(?:circa|around|~|ish|20\d{2}s|late\s+20\d{2}|early\s+20\d{2})\b/i;

function ruleCleanDates(resume: string): AtsRuleResult {
  const ranges = inspectResumeStructure(resume).dateRanges;
  const suspect = resume.match(SUSPECT_DATE_RE);
  if (ranges.length === 0) {
    return {
      rule: "Clean date formatting",
      passed: false,
      detail: "No recognizable date ranges (e.g., 'Jan 2022 – Mar 2024') found."
    };
  }
  if (suspect) {
    return {
      rule: "Clean date formatting",
      passed: false,
      detail: `Found fuzzy date language: "${suspect[0]}". Use explicit month/year ranges.`
    };
  }
  return {
    rule: "Clean date formatting",
    passed: true,
    detail: `${ranges.length} date range(s) found, all in a clean format.`
  };
}

// --- rule 3: no exotic structure --------------------------------------------

function ruleNoExoticStructure(resume: string, coverLetter: string): AtsRuleResult {
  const problems: string[] = [];
  // Markdown/HTML tables
  if (/\|\s*[-:]+\s*\|/.test(resume) || /<table[\s>]/i.test(resume)) {
    problems.push("table markup in resume");
  }
  if (/\|\s*[-:]+\s*\|/.test(coverLetter) || /<table[\s>]/i.test(coverLetter)) {
    problems.push("table markup in cover letter");
  }
  // Images embedded in text
  if (/!\[[^\]]*\]\(/.test(resume) || /<img[\s>]/i.test(resume)) {
    problems.push("image references in resume");
  }
  // Multi-column via tabs (very loose heuristic: many tab characters)
  const tabCount = (resume.match(/\t/g) ?? []).length;
  if (tabCount > 40) {
    problems.push(`many tab characters (${tabCount}) suggesting a columnar layout`);
  }
  return {
    rule: "No exotic structure",
    passed: problems.length === 0,
    detail:
      problems.length === 0
        ? "No tables, images, or obvious multi-column layout detected."
        : `Found: ${problems.join("; ")}.`
  };
}

// --- rule 4: keyword coverage -----------------------------------------------

function ruleKeywordCoverage(resume: string, jd: JdKeywords): AtsRuleResult {
  const required = jd.required ?? [];
  if (required.length === 0) {
    return {
      rule: "Keyword coverage",
      passed: true,
      detail: "No required keywords extracted; skipping."
    };
  }
  const lowered = resume.toLowerCase();
  const hits = required.filter((kw) => containsKeyword(lowered, kw));
  const coverage = hits.length / required.length;
  const passed = coverage >= KEYWORD_COVERAGE_THRESHOLD;
  const missing = required.filter((kw) => !containsKeyword(lowered, kw));
  return {
    rule: "Keyword coverage",
    passed,
    detail: passed
      ? `Covered ${hits.length}/${required.length} required keywords (${pct(coverage)}).`
      : `Covered ${hits.length}/${required.length} required keywords (${pct(coverage)}). Missing: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.`
  };
}

function containsKeyword(hay: string, kw: string): boolean {
  const term = kw.trim().toLowerCase();
  if (!term) return false;
  const variants = keywordVariants(term);
  if (variants.some((variant) => hay.includes(variant))) return true;
  // Handle acronyms/short tokens with word boundaries; longer phrases allow
  // loose match.
  if (term.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)`, "i").test(hay);
  }
  return hay.includes(term);
}

function keywordVariants(term: string): string[] {
  const normalized = term.replace(/[–—-]/g, " ").replace(/\s+/g, " ").trim();
  const variants = new Set([term, normalized]);
  const synonymMap: Record<string, string[]> = {
    "client facing": ["customer facing", "client-facing", "customer-facing"],
    "customer facing": ["client facing", "client-facing", "customer-facing"],
    "project workflow management": ["project management", "workflow management"],
    "business development": ["account growth", "account management", "sales"],
    "account growth": ["account management", "business development", "sales"],
    "crm pipeline": ["crm", "pipeline management"],
    "data reporting": ["reporting", "data analysis"],
    "writing communication": ["written communication", "communication"]
  };
  for (const synonym of synonymMap[normalized] ?? []) {
    variants.add(synonym);
  }
  return [...variants].filter(Boolean);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// --- rule 5: parseable work history -----------------------------------------

function ruleParseableWorkHistory(resume: string): AtsRuleResult {
  const structure = inspectResumeStructure(resume);
  const expBlock = structure.sectionText.experience;
  if (!expBlock) {
    return {
      rule: "Parseable work history",
      passed: false,
      detail: "Could not locate an Experience section."
    };
  }
  const detectedRoleCount = structure.roles.length;
  if (detectedRoleCount > 0) {
    const detectedRolesWithDescriptions = structure.roles.filter((role) => role.hasDescriptions).length;
    return {
      rule: "Parseable work history",
      passed: true,
      detail:
        detectedRolesWithDescriptions === detectedRoleCount
          ? `${detectedRoleCount} role(s) detected with descriptions.`
          : `${detectedRoleCount} role(s) detected; ${detectedRoleCount - detectedRolesWithDescriptions} missing role descriptions.`
    };
  }
  const dateRangesInExperience = inspectResumeStructure(expBlock).dateRanges;
  const hasBulletsInExperience = /^\s*(?:[-*]|\u2022|â€¢)\s+/m.test(expBlock);
  if (dateRangesInExperience.length > 0 && hasBulletsInExperience) {
    return {
      rule: "Parseable work history",
      passed: true,
      detail: `${dateRangesInExperience.length} date range(s) and bullet content detected in Experience.`
    };
  }
  // Rough role detection: a line with a date range nearby + a bullet in the
  // following block.
  const lines = expBlock.split("\n");
  let roleCount = 0;
  let rolesWithBullets = 0;
  let currentHasBullet = false;
  let currentStarted = false;
  for (const line of lines) {
    if (hasDateRange(line)) {
      if (currentStarted && currentHasBullet) rolesWithBullets++;
      roleCount++;
      currentStarted = true;
      currentHasBullet = false;
    } else if (currentStarted && /^\s*[-•*]/.test(line)) {
      currentHasBullet = true;
    }
  }
  if (currentStarted && currentHasBullet) rolesWithBullets++;
  DATE_RANGE_RE.lastIndex = 0; // reset sticky state on /g regex
  if (roleCount === 0) {
    return {
      rule: "Parseable work history",
      passed: false,
      detail: "No roles with date ranges found in Experience."
    };
  }
  const passed = rolesWithBullets === roleCount;
  return {
    rule: "Parseable work history",
    passed,
    detail: passed
      ? `${roleCount} role(s) detected, each with at least one bullet.`
      : `${roleCount} role(s) detected; ${roleCount - rolesWithBullets} missing bullets.`
  };
}

function hasDateRange(text: string): boolean {
  DATE_RANGE_RE.lastIndex = 0;
  return DATE_RANGE_RE.test(text);
}

// --- rule 6: parseable education --------------------------------------------

const DEGREE_RE = /\b(?:BS|B\.S\.|BA|B\.A\.|MS|M\.S\.|MA|M\.A\.|MBA|PhD|Ph\.D\.|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Associate(?:'s)?|Certificate|Diploma|Journalism|Multimedia|Communications?|Media)\b/i;

function ruleParseableEducation(resume: string): AtsRuleResult {
  const block = inspectResumeStructure(resume).sectionText.education;
  if (!block) {
    return {
      rule: "Parseable education",
      passed: false,
      detail: "Could not locate an Education section."
    };
  }
  const hasDegree = DEGREE_RE.test(block);
  const hasYear = /\b(19|20)\d{2}\b/.test(block);
  const hasInstitution = /(University|College|Institute|School|Academy)/i.test(block);
  const passed = hasDegree && hasYear && hasInstitution;
  const missing: string[] = [];
  if (!hasDegree) missing.push("degree/credential");
  if (!hasYear) missing.push("year");
  if (!hasInstitution) missing.push("institution");
  return {
    rule: "Parseable education",
    passed,
    detail: passed
      ? "Institution, credential/field, and year all detected."
      : `Missing in Education: ${missing.join(", ")}.`
  };
}

// --- rule 7: parseable skills -----------------------------------------------

function ruleParseableSkills(resume: string): AtsRuleResult {
  const block = inspectResumeStructure(resume).sectionText.skills;
  if (!block) {
    return {
      rule: "Parseable skills",
      passed: false,
      detail: "Could not locate a Skills section."
    };
  }
  // Reject nested sub-sections (e.g., "Programming:", "Tools:" sub-headings).
  const nestedHeaders = block.match(/^\s*[A-Z][A-Za-z &/]+:\s*$/gm);
  if (nestedHeaders && nestedHeaders.length > 3) {
    return {
      rule: "Parseable skills",
      passed: false,
      detail: `Skills section has nested sub-headings (${nestedHeaders.length}). Use a flat list.`
    };
  }
  const tokens = block.split(/[,\n•]/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 3) {
    return {
      rule: "Parseable skills",
      passed: false,
      detail: `Skills section has only ${tokens.length} item(s); expected a flat list.`
    };
  }
  return {
    rule: "Parseable skills",
    passed: true,
    detail: `${tokens.length} skills detected in a flat list.`
  };
}

// --- rule 8: ATS-friendly formatting ----------------------------------------

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const FANCY_BULLET_RE = /[◆◇▪▫■□★☆✓✔►▶◉•·]/;
const PAGE_NUMBER_RE = /\bPage\s+\d+\s+of\s+\d+\b/i;

function ruleAtsFriendlyFormatting(resume: string, coverLetter: string): AtsRuleResult {
  const problems: string[] = [];
  const combined = `${resume}\n${coverLetter}`;
  if (EMOJI_RE.test(combined)) problems.push("emojis present");
  // Allow • and - as bullets; flag other decorative ones
  const fancy = combined.match(/[◆◇▪▫■□★☆✓✔►▶◉]/g);
  if (fancy && fancy.length > 0) {
    problems.push(`decorative bullets/symbols (${fancy.length})`);
  }
  if (PAGE_NUMBER_RE.test(resume)) problems.push("'Page X of Y' in body");
  // Header/footer markers that sometimes leak from converted docs
  if (/<header[\s>]|<footer[\s>]/i.test(combined)) {
    problems.push("header/footer markup");
  }
  // Non-standard bullet chars only (loose)
  // Already covered above.
  return {
    rule: "ATS-friendly formatting",
    passed: problems.length === 0,
    detail:
      problems.length === 0
        ? "No emojis, decorative symbols, or header/footer markup."
        : `Found: ${problems.join("; ")}.`
  };
}

// --- rule 9: length sanity --------------------------------------------------

function ruleLengthSanity(resume: string, coverLetter: string): AtsRuleResult {
  const rw = wordCount(resume);
  const cw = wordCount(coverLetter);
  const problems: string[] = [];
  if (rw > MAX_RESUME_WORDS) problems.push(`resume is ${rw} words (max ${MAX_RESUME_WORDS})`);
  if (cw > MAX_COVER_LETTER_WORDS)
    problems.push(`cover letter is ${cw} words (max ${MAX_COVER_LETTER_WORDS})`);
  return {
    rule: "Length sanity",
    passed: problems.length === 0,
    detail:
      problems.length === 0
        ? `Resume ${rw} words, cover letter ${cw} words.`
        : problems.join("; ")
  };
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

// --- helpers ----------------------------------------------------------------

// Return the text under a heading that matches any of `patterns`, up to the
// next heading-looking line. A "heading-looking line" is a line that is short,
// has no trailing punctuation, and is mostly capitalized.
function sliceSection(text: string, patterns: RegExp[]): string | null {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((p) => p.test(lines[i]))) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (isHeadingLike(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function isHeadingLike(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 40) return false;
  if (/[.?!]$/.test(t)) return false;
  // Mostly letters, and no obvious sentence structure
  const lettersOnly = t.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 3) return false;
  const upper = lettersOnly.replace(/[^A-Z]/g, "").length;
  const ratio = upper / lettersOnly.length;
  // True if ALL CAPS, Title Case Words, or matches any of our known labels.
  if (ratio >= 0.6) return true;
  return /^[A-Z][a-z]+(\s+(&|and|\/)\s+[A-Z][a-z]+|\s+[A-Z][a-z]+){0,3}$/.test(t);
}
