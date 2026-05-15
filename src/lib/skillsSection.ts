const SKILLS_HEADING_RE =
  /^(?:key\s+skills|skills|core\s+skills|core\s+skills\s*\/\s*capabilities|core\s+competencies|technical\s+skills)\s*:?\s*$/i;

const SECTION_HEADING_RE = /^[A-Z][A-Z\s/&-]+:?$/;
const BULLET_PREFIX_RE = /^\s*(?:[-*]|\u2022|\u00e2\u20ac\u00a2)\s*/;

export function limitSkillsSection(resume: string, maxSkills = 9): string {
  const lines = resume.split("\n");
  const start = lines.findIndex((line) => SKILLS_HEADING_RE.test(line.trim()));
  if (start === -1) return resume;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (
      trimmed &&
      trimmed.length <= 42 &&
      SECTION_HEADING_RE.test(trimmed) &&
      !BULLET_PREFIX_RE.test(trimmed)
    ) {
      end = index;
      break;
    }
  }

  const limited = extractSkillItems(lines.slice(start + 1, end).join("\n")).slice(
    0,
    maxSkills
  );

  if (limited.length === 0) return resume;
  return [
    ...lines.slice(0, start + 1),
    ...limited.map((skill) => `- ${skill}`),
    ...lines.slice(end)
  ].join("\n");
}

export function extractSkillItems(skillsText: string): string[] {
  const items = skillsText
    .split(/(?:[,;\n|\u2022]+|\u00e2\u20ac\u00a2+)/)
    .map(cleanSkillItem)
    .filter(isMeaningfulSkill);

  const seen = new Set<string>();
  return items.filter((skill) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanSkillItem(skill: string): string {
  return skill
    .replace(BULLET_PREFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMeaningfulSkill(skill: string): boolean {
  if (!skill || skill.length > 80) return false;
  const words = skill.split(/\s+/).filter(Boolean);
  if (words.length === 1 && skill.length < 9) return false;
  if (/^\W+$/.test(skill)) return false;
  if (/^(and|or|with|through|follow)$/i.test(skill)) return false;
  return true;
}
