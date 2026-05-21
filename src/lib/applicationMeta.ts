export function inferJobMeta(jobPostText: string): {
  jobTitle?: string;
  companyName?: string;
} {
  const lines = jobPostText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const title = inferJobTitle(lines);
  const companyName = inferCompanyName(lines);

  return {
    jobTitle: title ? title.slice(0, 90) : undefined,
    companyName: companyName && companyName.length <= 80 ? companyName : undefined
  };
}

export function buildApplicationTitle(meta: {
  jobTitle?: string;
  companyName?: string | null;
}) {
  if (meta.jobTitle && meta.companyName) return `${meta.jobTitle} - ${meta.companyName}`;
  if (meta.jobTitle) return meta.jobTitle;
  if (meta.companyName) return `${meta.companyName} Application`;
  return "Untitled application";
}

export function normalizeSavedApplicationTitle(args: {
  title?: string | null;
  companyName?: string | null;
  sourceJobDescription?: string | null;
}) {
  const cleaned = args.title?.replace(/\s+/g, " ").trim();
  if (cleaned && !isBadApplicationTitle(cleaned)) return cleaned;
  const meta = inferJobMeta(args.sourceJobDescription ?? "");
  return buildApplicationTitle({
    jobTitle: meta.jobTitle,
    companyName: meta.companyName ?? args.companyName
  });
}

function inferJobTitle(lines: string[]) {
  for (const line of lines.slice(0, 20)) {
    const titleMatch = line.match(/^(?:job\s*title|role|position|opening)\s*:\s*(.+)$/i);
    if (titleMatch) return cleanJobTitle(titleMatch[1]);
  }

  const joinedHeading = lines.slice(0, 4).join(" ");
  const parentheticalTitle = joinedHeading.match(
    /\b([A-Z][A-Za-z/&+\-\s]{2,70}?\b(?:Manager|Specialist|Coordinator|Director|Assistant|Lead|Analyst|Associate|Consultant|Representative|Advisor|Administrator|Executive|Strategist|Designer|Developer|Engineer)(?:\s*\([^)]+\))?)/,
  );
  if (parentheticalTitle) {
    const cleaned = cleanJobTitle(parentheticalTitle[1]);
    if (cleaned) return cleaned;
  }

  const firstTrustedHeading = lines
    .slice(0, 8)
    .find((line) => isLikelyJobTitleLine(line));
  return firstTrustedHeading ? cleanJobTitle(firstTrustedHeading) : undefined;
}

function inferCompanyName(lines: string[]) {
  for (const line of lines.slice(0, 20)) {
    const aboutMatch = line.match(/^about\s+(.+)$/i);
    if (aboutMatch) return cleanCompanyName(aboutMatch[1]);

    const companyMatch = line.match(/^(?:company|employer|organization|organisation)\s*:\s*(.+)$/i);
    if (companyMatch) return cleanCompanyName(companyMatch[1]);
  }
  const companyIntro = lines
    .slice(0, 16)
    .map((line) => line.match(/^([A-Z][A-Za-z0-9&.'+\- ]{1,60})\s+is\s+(?:a|an|the)\b/)?.[1])
    .find(Boolean);
  if (companyIntro) return cleanCompanyName(companyIntro);
  return undefined;
}

function cleanCompanyName(value: string) {
  const cleaned = value
    .replace(/\b(?:the\s+)?job\b/gi, "")
    .replace(/\s+team$/i, "")
    .replace(/[.:\-–—|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return isLikelyCompanyName(cleaned) ? cleaned : undefined;
}

function cleanJobTitle(value: string) {
  const cleaned = value
    .replace(/\s+(?:at|with)\s+.+$/i, "")
    .replace(/[.:\-â€“â€”|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return isLikelyJobTitleLine(cleaned) ? cleaned : undefined;
}

function isLikelyJobTitleLine(line: string) {
  if (!isShortHeading(line)) return false;
  if (isCompanySectionHeading(line)) return false;
  if (isBodyOrMarketingLine(line)) return false;
  if (isCandidateTraitLine(line)) return false;
  if (/\b(?:people leader|reports to|reporting to|hiring manager|vp product)\b/i.test(line)) {
    return false;
  }
  if (/^(must-have|nice-to-have|required|requirements|qualifications|what you.?ll do|who this role is for)$/i.test(line)) {
    return false;
  }
  if (isGenericBadTitle(line)) return false;
  return /\b(manager|specialist|coordinator|director|assistant|lead|analyst|associate|consultant|representative|success|marketing|operations|product|sales|designer|developer|engineer|advisor|administrator)\b/i.test(
    line
  );
}

function isShortHeading(line: string) {
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 10 && line.length <= 90 && !/[.!?]$/.test(line);
}

function isCompanySectionHeading(line: string) {
  return /^(about|who we are|our mission|why join|what we offer|benefits|location|salary|application instructions)\b/i.test(
    line
  );
}

function isBodyOrMarketingLine(line: string) {
  return /\b(?:is a|are a|we are|we're|you'll|you will|helping|helps|join us|our platform|our product|proven system|high-growth|better working world)\b/i.test(
    line
  );
}

function isCandidateTraitLine(line: string) {
  return /^(?:have|has|are|is|can|want|like|enjoy|comfortable|familiar|strong|very|highly)\b/i.test(
    line
  );
}

function isLikelyCompanyName(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6 || value.length > 80) return false;
  if (/^(?:the\s+)?job$/i.test(value)) return false;
  if (/^(?:role|position|opening|application|candidate|team|company)$/i.test(value)) return false;
  return !isBodyOrMarketingLine(value);
}

function isGenericBadTitle(line: string) {
  return /\b(?:business\s*\+\s*marketing mindset|smart,?\s+organized|coachable|high standards|great fit|the job|recently graduated|want a real career path)\b/i.test(
    line
  );
}

function isBadApplicationTitle(title: string) {
  return (
    /^(?:the\s+)?job(?:\s+application)?$/i.test(title) ||
    /\b(?:have a business|business\s*\+\s*marketing mindset|recently graduated|want a real career path|the job application)\b/i.test(title) ||
    (title.length > 90 && /\b(?:you will|you'll|we are|is a|helping|helps)\b/i.test(title))
  );
}
