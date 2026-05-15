import { runResumeStructureChecks } from "./atsChecker";
import { inspectResumeStructure } from "./resumeStructure";
import type { AtsRuleResult, FollowUp } from "./types";

export type PreGenerationBlocker = {
  id: string;
  label: string;
  question: string;
  detail: string;
  required: boolean;
  placeholder?: string;
};

export function getPreGenerationBlockers(resumeText: string): PreGenerationBlocker[] {
  const report = runResumeStructureChecks(resumeText);
  const structure = inspectResumeStructure(resumeText);
  return [
    ...buildRoleDescriptionEnhancements(structure.roles),
    ...buildPreGenerationBlockers(report, structure)
  ];
}

export function buildPreGenerationBlockers(
  report: AtsRuleResult[],
  structure?: ReturnType<typeof inspectResumeStructure>
): PreGenerationBlocker[] {
  const blockers: PreGenerationBlocker[] = [];

  for (const rule of report) {
    if (rule.passed) continue;
    const detail = rule.detail ?? "";
    if (rule.rule === "Parseable work history") {
      if (/role\(s\) detected.*missing role descriptions/i.test(detail)) {
        continue;
      }
      if (/date/i.test(detail) && structure?.roles.some((role) => role.title || role.company)) {
        blockers.push(...buildRoleDateQuestions(structure.roles));
        continue;
      }
      blockers.push({
        id: "ats-work-history",
        label: "Work history details",
        question:
          /date/i.test(detail)
            ? "What job date ranges should we use for the roles in your resume?"
            : "I’m having trouble reading parts of your work history clearly. Which recent role, company, or responsibilities should we make sure are included before we tailor the resume?",
        detail,
        required: true
      });
      continue;
    }
    if (rule.rule === "Parseable education") {
      if (/year/i.test(detail) && structure?.education.length) {
        blockers.push(...buildEducationDateQuestions(structure.education, detail));
        continue;
      }
      blockers.push({
        id: "ats-education",
        label: "Education details",
        question: educationQuestion(detail),
        detail,
        required: /year|institution|degree|credential|field/i.test(detail)
      });
      continue;
    }
    if (rule.rule === "Clean date formatting") {
      blockers.push({
        id: "ats-date-formatting",
        label: "Date ranges",
        question:
          "What clean date ranges should we use for your relevant work or education entries?",
        detail,
        required: true
      });
    }
  }

  return dedupeBlockers(blockers);
}

function buildRoleDescriptionEnhancements(
  roles: ReturnType<typeof inspectResumeStructure>["roles"]
): PreGenerationBlocker[] {
  if (roles.length === 0) return [];
  const weakRoles = roles.filter((role) => !role.hasDescriptions || role.bullets.length < 2);
  if (weakRoles.length === 0) return [];
  const emptyRoles = roles.filter((role) => !role.hasDescriptions);
  if (emptyRoles.length / roles.length <= 0.5) return [];
  if (emptyRoles.length === roles.length) {
    return [
      {
        id: "ats-role-descriptions",
        label: "Role descriptions",
        question:
          "We found your job titles, but no descriptions. Want us to generate strong bullet points for each role based on your experience?",
        detail: `${roles.length} role(s) detected without bullet descriptions. This is an enhancement, not a blocker.`,
        required: false,
        placeholder:
          "Optional: add any quick details you want reflected, or leave blank and we will generate bullets from the roles and job posting."
      }
    ];
  }
  const role = weakRoles[0];
  return [
    {
      id: `ats-role-description-${slugify(role.header)}`,
      label: "Role description",
      question: `Can you add 1-2 details about what you did in ${role.header} to strengthen your resume?`,
      detail: "Role detected with fewer than 2 bullet points. This is an enhancement, not a blocker.",
      required: false,
      placeholder:
        "Optional: add 1-2 quick details about responsibilities, tools, customers, projects, or outcomes."
    }
  ];
}

function buildRoleDateQuestions(
  roles: ReturnType<typeof inspectResumeStructure>["roles"]
): PreGenerationBlocker[] {
  const targets = roles.filter((role) => !role.dateRange && (role.title || role.company)).slice(0, 3);
  return targets.map((role, index) => ({
    id: `ats-role-date-${slugify([role.title, role.company].filter(Boolean).join("-") || role.header || String(index))}`,
    label: "Work dates",
    question: role.title && role.company
      ? `What date range should we use for ${role.title} at ${role.company}?`
      : role.company
        ? `What dates did you work at ${role.company}?`
        : `What years did you work in ${role.title}?`,
    detail: "This role is missing a date range. Dates improve ATS parsing, but you can skip this if you do not know them right now.",
    required: false,
    placeholder: "Example: Jan 2021 - Mar 2024, or 2023 - Present"
  }));
}

function buildEducationDateQuestions(
  educationEntries: string[],
  detail: string
): PreGenerationBlocker[] {
  return collectEducationEntities(educationEntries)
    .filter((entity) => !entity.hasDate)
    .slice(0, 3)
    .map((entity, index) => {
      const label = [entity.program, entity.school].filter(Boolean).join(" at ") || "Education date";
      return {
        id: `ats-education-date-${slugify(label || String(index))}`,
        label: "Education date",
        question: educationDateQuestion(entity.program, entity.school),
        detail,
        required: false,
        placeholder: entity.program || entity.school ? "Example: 2019, or 2017 - 2019" : "Example: 2019"
      };
    });
}

function collectEducationEntities(
  entries: string[]
): Array<{ program?: string; school?: string; hasDate: boolean }> {
  const cleanEntries = entries.filter(isCleanEducationEntityLine);
  const parsed = cleanEntries.map(parseEducationEntity);
  const knownSchool = parsed.find((entity) => entity.school)?.school;
  const candidates = parsed.map((entity) => ({
    ...entity,
    school: entity.school ?? (entity.program ? knownSchool : undefined)
  }));
  const bestByKey = new Map<string, { program?: string; school?: string; hasDate: boolean }>();

  for (const candidate of candidates) {
    if (!candidate.program && !candidate.school) continue;
    if (!candidate.program && candidate.school && candidates.some((other) => other.program && other.school === candidate.school)) {
      continue;
    }
    const key = canonicalEducationKey(candidate.program, candidate.school);
    const existing = bestByKey.get(key);
    if (!existing || specificityScore(candidate) > specificityScore(existing)) {
      bestByKey.set(key, candidate);
    }
  }

  return [...bestByKey.values()];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function blockerAnswerToFollowUp(
  blocker: PreGenerationBlocker,
  answer: string
): FollowUp {
  return {
    id: `pre-generation-${blocker.id}`,
    requirementId: blocker.id,
    question: blocker.question,
    answer: answer.trim()
  };
}

function educationQuestion(detail: string): string {
  if (/year/i.test(detail) && !/institution/i.test(detail)) {
    return "What year should we use for your education entry?";
  }
  if (/institution/i.test(detail) && !/year/i.test(detail)) {
    return "What school or institution should we use for your education entry?";
  }
  return "What missing education detail should we include, such as school, program, or completion year?";
}

function parseEducationEntity(entry: string): { program?: string; school?: string; hasDate: boolean } {
  const schoolMatch = entry.match(/\b([A-Z][A-Za-z&.' -]+(?:University|College|Institute|School|Academy)[A-Za-z&.' -]*)\b/);
  const school = schoolMatch?.[1]?.trim();
  const program = entry
    .replace(school ?? "", "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\b(?:Honou?rs?|Distinction|GPA|Scholarship|Award)\b.*$/i, "")
    .replace(/\s*(?:,|\||-|\u2013|\u2014|\bat\b)\s*$/i, "")
    .replace(/^\s*(?:,|\||-|\u2013|\u2014|\bat\b)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    program: program || undefined,
    school,
    hasDate: /\b(?:19|20)\d{2}\b/.test(entry)
  };
}

function isCleanEducationEntityLine(entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  if (/^\s*(?:[-*]|\u2022|\u25cf|\u25aa|\u00b7|\d+[.)])\s+/.test(trimmed)) return false;
  if (/\b(award|awards|scholarship|scholarships|dean'?s list|distinction|honou?rs?|honors?|recognition|achievement|gpa)\b/i.test(trimmed)) {
    return false;
  }
  if (/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length > 5) return false;
  return true;
}

function canonicalEducationKey(program?: string, school?: string): string {
  return [program, school]
    .filter(Boolean)
    .map((value) =>
      value!
        .toLowerCase()
        .replace(/\b(post[-\s]?graduate|postgraduate|studies|program|certificate|diploma|degree)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    )
    .join("|");
}

function specificityScore(entity: { program?: string; school?: string }): number {
  return (entity.program ? 2 : 0) + (entity.school ? 1 : 0);
}

function educationDateQuestion(program?: string, school?: string): string {
  if (program && school) return `What years did you attend ${program} at ${school}?`;
  if (school) return `What year did you complete your program at ${school}?`;
  if (program) return `What year did you complete ${program}?`;
  return "What completion year should we use for this education entry?";
}

function dedupeBlockers(blockers: PreGenerationBlocker[]): PreGenerationBlocker[] {
  const seen = new Set<string>();
  return blockers.filter((blocker) => {
    if (seen.has(blocker.id)) return false;
    seen.add(blocker.id);
    return true;
  });
}
