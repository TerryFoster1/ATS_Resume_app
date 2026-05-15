import type { AnalysisResult, FollowUp, MatchEvaluation, ResumeEvidence } from "../types";
import {
  evaluateAnswerEvidenceQuality,
  extractImpactPhrase,
  qualitativeImpactForText
} from "./answerEvidenceQuality";

export type RoleContext = {
  company?: string;
  title?: string;
};

export type TransformedAnswer = {
  requirementId: string;
  roleContext: RoleContext;
  bullet: string;
};

type TransformArgs = {
  answer: string;
  match: MatchEvaluation;
  roleContext: RoleContext;
};

export function roleContextForMatch(
  analysis: AnalysisResult,
  match: MatchEvaluation
): RoleContext {
  const evidenceById = new Map(analysis.evidence.map((e) => [e.id, e]));
  const directEvidence = match.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter((e): e is ResumeEvidence => Boolean(e));
  const roleEvidence =
    directEvidence.find((e) => hasRoleContext(e)) ??
    analysis.evidence.find((e) => e.source.section === "EXPERIENCE" && hasRoleContext(e));

  return {
    company: roleEvidence?.source.company,
    title: roleEvidence?.source.title
  };
}

export function transformAnswerToResumeContent({
  answer,
  match,
  roleContext
}: TransformArgs): string | null {
  if (!answer.trim() || isNegativeAnswer(answer)) return null;

  const requirement = match.requirementText.toLowerCase();
  const combined = `${requirement} ${answer}`.toLowerCase();
  const intent = inferIntent(combined);
  const quality = evaluateAnswerEvidenceQuality(answer);
  const impact = extractImpactPhrase(answer) ?? qualitativeImpactForText(combined);
  const hasUsefulDetail = quality.strength !== "weak" || quality.hasContext || quality.hasAction;

  if (!hasUsefulDetail && !/\bfrench\b/i.test(requirement)) return null;

  if (intent === "profitability") {
    if (/\bspreadsheet|excel|sheet\b/i.test(answer)) {
      return joinBullet("Used spreadsheets to track project budgets, costs, and scope across client work", impact);
    }
    if (/\bscope|change|changes\b/i.test(answer)) {
      return joinBullet("Coordinated client projects across scope, costs, and timelines", impact);
    }
    return joinBullet("Tracked budgets, costs, and project scope across client work", impact);
  }

  if (intent === "budgeting") {
    return joinBullet("Tracked budgets, costs, and timelines across project work", impact);
  }

  if (intent === "tools") {
    return joinBullet(`Used ${cleanToolList(answer)} to organize work, track details, and manage follow-up`, impact);
  }

  if (intent === "language") {
    if (/\bfrench\b/i.test(requirement)) {
      return "Can communicate in French when needed for customer or stakeholder interactions";
    }
    return null;
  }

  if (intent === "writing") {
    return joinBullet("Created customer-facing and stakeholder content", impact);
  }

  if (intent === "project") {
    return joinBullet("Coordinated client work across timelines, priorities, and follow-ups", impact);
  }

  if (/\btemplate|templated|brand|accuracy|consistency|compliance\b/i.test(combined)) {
    return joinBullet("Prepared standardized client communications with attention to accuracy, consistency, and brand expectations", impact);
  }  if (/\bemail|campaign|newsletter|automation\b/i.test(combined)) {
    return joinBullet("Developed and managed email campaigns, customer lists, and follow-up workflows", impact);
  }
  if (/\bcrm|pipeline|lead|customer list|outreach|follow\s*up\b/i.test(combined)) {
    return joinBullet("Managed customer lists, outreach, pipeline tracking, and follow-up activity", impact);
  }
  if (/\bpresentation|powerpoint|slide|proposal|deck|sales material\b/i.test(combined)) {
    return joinBullet("Created client-facing presentations, proposals, and sales materials", impact);
  }

  if (/\beducation|college|degree|diploma|post secondary|equivalent professional experience\b/i.test(combined)) {
    return "Applied post-secondary training and professional experience to client-facing, content, and project work";
  }

  return joinBullet(`Supported ${cleanRequirementForBullet(match.requirementText)} through relevant client-facing, operational, or project experience`, impact);
}
export const transformAnswerToBullet = transformAnswerToResumeContent;
export function answersByRequirementId(followUps: FollowUp[]): Record<string, string> {
  return Object.fromEntries(
    followUps
      .map((followUp) => [followUp.requirementId, followUp.answer.trim()] as const)
      .filter(([, answer]) => answer.length > 0 && !isNegativeAnswer(answer))
  );
}

export function enforceAnsweredEvidenceInResume(args: {
  resumeText: string;
  analysis: AnalysisResult;
  followUps: FollowUp[];
}): { resumeText: string; inserted: TransformedAnswer[]; unused: string[] } {
  const answers = answersByRequirementId(args.followUps);
  let resumeText = args.resumeText;
  const inserted: TransformedAnswer[] = [];
  const unused: string[] = [];

  for (const match of args.analysis.matches) {
    const answer = answers[match.requirementId]?.trim();
    if (!answer) continue;
    const roleContext = roleContextForMatch(args.analysis, match);
    const bullet = transformAnswerToResumeContent({ answer, match, roleContext });
    if (!bullet) {
      unused.push(match.requirementId);
      continue;
    }
    if (answerAlreadyRepresented(resumeText, answer, bullet, match.requirementText)) continue;
    resumeText = insertBulletIntoRole(resumeText, roleContext, bullet);
    inserted.push({ requirementId: match.requirementId, roleContext, bullet });
  }

  return { resumeText, inserted, unused };
}

export function applyTransformedAnswersToResume(args: {
  resumeText: string;
  analysis: AnalysisResult;
  answers: Record<string, string>;
}): { resumeText: string; transformed: TransformedAnswer[] } {
  let resumeText = args.resumeText;
  const transformed: TransformedAnswer[] = [];

  for (const match of args.analysis.matches) {
    const answer = args.answers[match.requirementId]?.trim();
    if (!answer) continue;
    const roleContext = roleContextForMatch(args.analysis, match);
    const bullet = transformAnswerToResumeContent({ answer, match, roleContext });
    if (!bullet) continue;
    resumeText = insertBulletIntoRole(resumeText, roleContext, bullet);
    transformed.push({ requirementId: match.requirementId, roleContext, bullet });
  }

  return { resumeText, transformed };
}

export function coachingQuestionForMatch(
  match: MatchEvaluation,
  roleContext: RoleContext
): string {
  const requirement = match.requirementText.toLowerCase();
  const where = roleContext.company ? `At ${roleContext.company}` : "In this role";

  if (/\bprofitability|margin|scope|budget|cost\b/i.test(requirement)) {
    return `${where}, did you track project profitability or manage scope to protect margins? If so, how did you typically do that?`;
  }
  if (/\btool|office|excel|spreadsheet|google workspace|microsoft\b/i.test(requirement)) {
    return `${where}, what tools did you use for tracking work, budgets, client details, or follow-up?`;
  }
  if (/\bfrench\b/i.test(requirement)) {
    return "Do you have any French language proficiency we should mention?";
  }
  if (/\bwriting|written|content|communication\b/i.test(requirement)) {
    return `${where}, did you write customer-facing or stakeholder content? What kinds of materials did you create?`;
  }
  if (/\bproject|timeline|deadline|coordinate|multiple\b/i.test(requirement)) {
    return `${where}, what kinds of projects, timelines, or moving pieces did you coordinate?`;
  }
  return (
    match.clarificationQuestion ??
    "Have you handled comparable work in a professional setting? What did you do, what was the context, and what changed or improved because of it?"
  );
}

function joinBullet(actionAndContext: string, impact: string): string {
  const cleanedAction = actionAndContext.replace(/[.!?]+$/g, "").trim();
  const cleanedImpact = impact.replace(/[.!?]+$/g, "").trim();
  if (!cleanedImpact) return cleanedAction;
  const loweredAction = cleanedAction.toLowerCase();
  const loweredImpact = cleanedImpact.toLowerCase();
  if (loweredImpact.startsWith(loweredAction)) return sentenceCase(cleanedImpact);
  return `${cleanedAction}, ${cleanedImpact}`;
}

function sentenceCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
function insertBulletIntoRole(
  resumeText: string,
  roleContext: RoleContext,
  bullet: string
): string {
  const lines = resumeText.split("\n");
  const bulletLine = `- ${bullet}`;
  if (lines.some((line) => line.trim().toLowerCase() === bulletLine.toLowerCase())) {
    return resumeText;
  }

  const targetIndex = findRoleLine(lines, roleContext);
  if (targetIndex === -1) {
    return `${resumeText.trim()}\n\nADDITIONAL CANDIDATE CONTEXT\n${bulletLine}`;
  }

  let insertAt = targetIndex + 1;
  while (insertAt < lines.length && isRoleMetadataLine(lines[insertAt])) {
    insertAt++;
  }
  while (insertAt < lines.length && isBulletLine(lines[insertAt])) {
    insertAt++;
  }

  return [...lines.slice(0, insertAt), bulletLine, ...lines.slice(insertAt)].join("\n");
}

function findRoleLine(lines: string[], roleContext: RoleContext): number {
  const company = roleContext.company?.toLowerCase();
  const title = roleContext.title?.toLowerCase();
  if (!company && !title) return -1;
  return lines.findIndex((line) => {
    const lowered = line.toLowerCase();
    return Boolean((company && lowered.includes(company)) || (title && lowered.includes(title)));
  });
}

function inferIntent(
  text: string
): "profitability" | "budgeting" | "tools" | "language" | "writing" | "project" | "general" {
  if (/\bprofit|profitability|margin|scope|cost|budget\b/.test(text)) {
    return /\bbudget\b/.test(text) && !/\bprofit|margin|scope\b/.test(text)
      ? "budgeting"
      : "profitability";
  }
  if (/\bspreadsheet|excel|google sheets|microsoft|office|tool\b/.test(text)) {
    return "tools";
  }
  if (/\bfrench|english|language|bilingual\b/.test(text)) return "language";
  if (/\bwrite|written|content|copy|proposal|communication|stakeholder\b/.test(text)) {
    return "writing";
  }
  if (/\bproject|timeline|deadline|coordinate|vendor|installation\b/.test(text)) {
    return "project";
  }
  return "general";
}

function cleanToolList(answer: string): string {
  const compact = answer
    .replace(/\b(yes|yeah|yep|using|used|mostly|kind of)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return compact || "spreadsheets and internal tracking tools";
}

function isRoleMetadataLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isBulletLine(trimmed)) return false;
  if (/^(summary|experience|education|skills|tools)$/i.test(trimmed)) return false;
  return trimmed.length < 100;
}

function isBulletLine(line: string): boolean {
  return /^\s*(?:[â€¢*-])\s+/.test(line);
}

function hasRoleContext(evidence: ResumeEvidence): boolean {
  return Boolean(evidence.source.company || evidence.source.title);
}

function isNegativeAnswer(answer: string): boolean {
  return /\b(no|none|not applicable|n\/a|do not|don't|did not|haven't|have not)\b/i.test(
    answer
  );
}

function answerAlreadyRepresented(
  resumeText: string,
  answer: string,
  bullet: string,
  requirementText: string
): boolean {
  const haystack = resumeText.toLowerCase();
  const bulletWords = keywordSet(`${bullet} ${requirementText}`);
  const answerWords = keywordSet(answer);
  const importantWords = [...new Set([...bulletWords, ...answerWords])].filter(
    (word) => word.length >= 5
  );
  if (importantWords.length === 0) return false;
  const hits = importantWords.filter((word) => haystack.includes(word)).length;
  return hits >= Math.min(3, importantWords.length);
}

function keywordSet(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter(
      (word) =>
        !/^(this|that|with|from|your|have|used|using|role|work|what|when|where|which|should|could|would)$/i.test(
          word
        )
    );
}

function cleanRequirementForBullet(requirementText: string): string {
  return requirementText
    .replace(/[^a-z0-9\s,/&-]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90)
    .toLowerCase();
}







