export type ApplicationStatus = "Draft" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Archived";

export type ApplicationPipelineMeta = {
  jobTitle: string;
  companyName?: string | null;
  displayTitle: string;
  status: ApplicationStatus;
};

export function inferJobMeta(jobPostText: string): {
  jobTitle?: string;
  companyName?: string;
} {
  const lines = jobPostText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headingMeta = inferHeadingRoleCompany(lines);
  const title = headingMeta.jobTitle ?? inferJobTitle(lines);
  const companyName = headingMeta.companyName ?? inferCompanyName(lines);

  return {
    jobTitle: title ? title.slice(0, 90) : undefined,
    companyName: companyName && companyName.length <= 80 ? companyName : undefined
  };
}

export function buildApplicationTitle(meta: {
  jobTitle?: string;
  companyName?: string | null;
}) {
  const jobTitle = meta.jobTitle && !isBadApplicationTitle(meta.jobTitle)
    ? meta.jobTitle
    : undefined;
  const companyName = meta.companyName && isLikelyCompanyName(meta.companyName)
    ? meta.companyName
    : undefined;
  if (jobTitle && companyName) return `${jobTitle} - ${companyName}`;
  if (jobTitle) return jobTitle;
  if (companyName) return `Application - ${companyName}`;
  return "Untitled application";
}

export function normalizeSavedApplicationTitle(args: {
  title?: string | null;
  companyName?: string | null;
  sourceJobDescription?: string | null;
}) {
  return resolveApplicationPipelineMeta(args).displayTitle;
}

export function resolveApplicationPipelineMeta(args: {
  title?: string | null;
  companyName?: string | null;
  sourceJobDescription?: string | null;
  analysisSnapshot?: unknown;
}): ApplicationPipelineMeta {
  const sourceMeta = inferJobMeta(args.sourceJobDescription ?? "");
  const titleMeta = inferTitleMeta(args.title ?? "");
  const savedTitle = cleanSavedTitle(args.title ?? "");
  const savedCompany = args.companyName && isLikelyCompanyName(args.companyName)
    ? args.companyName
    : undefined;
  const jobTitle =
    sourceMeta.jobTitle ??
    titleMeta.jobTitle ??
    (savedTitle && !looksLikeCompanyOnly(savedTitle) ? savedTitle : undefined) ??
    "Untitled application";
  const companyName = sourceMeta.companyName ?? savedCompany ?? titleMeta.companyName ?? null;

  return {
    jobTitle,
    companyName,
    displayTitle: buildApplicationTitle({ jobTitle, companyName }),
    status: readApplicationStatus(args.analysisSnapshot)
  };
}

export function readApplicationStatus(snapshot: unknown): ApplicationStatus {
  if (!isRecord(snapshot)) return "Draft";
  const raw = snapshot.applicationStatus;
  if (typeof raw !== "string") return "Draft";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "applied") return "Applied";
  if (normalized === "interviewing") return "Interviewing";
  if (normalized === "offer") return "Offer";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "archived") return "Archived";
  return "Draft";
}

export function buildInitialAnalysisSnapshot(analysis: unknown): unknown {
  if (isRecord(analysis)) {
    return {
      ...analysis,
      applicationStatus: readApplicationStatus(analysis)
    };
  }
  return { applicationStatus: "Draft" };
}

function inferTitleMeta(value: string): {
  jobTitle?: string;
  companyName?: string;
} {
  const cleaned = cleanSavedTitle(value);
  if (!cleaned) return {};
  const parts = splitTitleParts(cleaned);
  if (parts.length >= 2) {
    const jobTitle = cleanJobTitle(parts[0]);
    const companyName = cleanCompanyName(parts.slice(1).join(" "));
    if (jobTitle || companyName) return { jobTitle, companyName };
  }
  return {
    jobTitle: cleanJobTitle(cleaned),
    companyName: cleanCompanyName(cleaned)
  };
}

function inferHeadingRoleCompany(lines: string[]) {
  for (const line of lines.slice(0, 8)) {
    const parts = splitTitleParts(line);
    if (parts.length < 2 || parts.length > 3) continue;

    const firstTitle = cleanJobTitle(parts[0]);
    const secondCompany = cleanCompanyName(parts[1]);
    if (firstTitle && secondCompany) {
      return { jobTitle: firstTitle, companyName: secondCompany };
    }

    const firstCompany = cleanCompanyName(parts[0]);
    const secondTitle = cleanJobTitle(parts[1]);
    if (firstCompany && secondTitle) {
      return { jobTitle: secondTitle, companyName: firstCompany };
    }
  }
  return {};
}

function inferJobTitle(lines: string[]) {
  for (const line of lines.slice(0, 20)) {
    const titleMatch = line.match(/^(?:job\s*title|role|position|opening)\s*:\s*(.+)$/i);
    if (titleMatch) return cleanJobTitle(titleMatch[1]);
  }

  const joinedHeading = lines.slice(0, 4).join(" ");
  const parentheticalTitle = joinedHeading.match(
    /\b([A-Z][A-Za-z/&+\-\s]{2,70}?\b(?:Manager|Specialist|Coordinator|Director|Assistant|Lead|Analyst|Associate|Consultant|Representative|Advisor|Administrator|Executive|Strategist|Designer|Developer|Engineer)(?:\s*\([^)]+\))?)/
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

function splitTitleParts(value: string) {
  return value
    .split(/\s+(?:-|[\u2013\u2014]|\|)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanSavedTitle(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || isBadApplicationTitle(cleaned)) return undefined;
  return cleaned;
}

function cleanCompanyName(value: string) {
  const cleaned = value
    .replace(/\b(?:the\s+)?job\b/gi, "")
    .replace(/\s+team$/i, "")
    .replace(/[.:\-\u2013\u2014|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return isLikelyCompanyName(cleaned) ? cleaned : undefined;
}

function cleanJobTitle(value: string) {
  const cleaned = value
    .replace(/\s+(?:at|with)\s+.+$/i, "")
    .replace(/[.:\-\u2013\u2014|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return isLikelyJobTitleLine(cleaned) ? cleaned : undefined;
}

function looksLikeCompanyOnly(value: string) {
  return Boolean(cleanCompanyName(value)) && !cleanJobTitle(value);
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
  return /\b(manager|specialist|coordinator|director|assistant|lead|analyst|associate|consultant|representative|success|marketing|operations|product|sales|designer|developer|engineer|advisor|administrator|coordinator)\b/i.test(
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
  return !isBodyOrMarketingLine(value) && !isCandidateTraitLine(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
