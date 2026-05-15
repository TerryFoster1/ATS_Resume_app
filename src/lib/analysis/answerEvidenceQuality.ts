export type EvidenceQualityField = "context" | "action" | "result" | "metric";

export type AnswerEvidenceQuality = {
  hasContext: boolean;
  hasAction: boolean;
  hasResult: boolean;
  hasMetric: boolean;
  strength: "weak" | "basic" | "good" | "strong";
  missing: EvidenceQualityField[];
};

const ACTION_RE = /\b(created|create|managed|manage|tracked|track|coordinated|coordinate|built|build|developed|develop|launched|launch|wrote|write|prepared|prepare|reviewed|review|sent|send|organized|organize|improved|improve|reduced|reduce|increased|increase|supported|support|handled|handle|used|use|maintained|maintain|monitored|monitor|deployed|deploy|updated|update|reported|report|followed up|follow up)\b/i;
const CONTEXT_RE = /\b(client|customer|stakeholder|email|campaign|newsletter|onboarding|account|project|budget|scope|spreadsheet|excel|crm|pipeline|presentation|deck|proposal|training|report|vendor|team|brand|compliance|workflow|lead|outreach|template|communication|sales|support|timeline|follow-up|follow up)\b/i;
const RESULT_RE = /\b(improved|reduced|increased|saved|grew|won|clarified|faster|fewer|better|stronger|kept|prevented|resolved|helped|supported|led to|resulted|so that|which helped|impact|outcome|approved|retention|satisfaction|engagement|replies|completion|clarity|consistency|alignment|friction|efficiency|accuracy|on schedule|within scope|on time|repeat|missed)\b/i;
const METRIC_RE = /(?:\b\d+(?:\.\d+)?\s*(?:%|percent|hours?|days?|weeks?|months?|years?|clients?|accounts?|projects?|campaigns?|emails?|leads?|decks?|reports?|orders?|tickets?)\b|\$\s?\d|\b\d+x\b|\b\d+\s?[-+]\s?\d+\b)/i;
const WEAK_RE = /^(yes|yeah|yep|kind of|sort of|sure|ok|okay|maybe|no|none|n\/?a|not applicable)\.?$/i;
const NEGATIVE_RE = /\b(no|none|not applicable|n\/?a|do not|don't|did not|haven't|have not|never)\b/i;

export function evaluateAnswerEvidenceQuality(answer: string): AnswerEvidenceQuality {
  const cleaned = answer.replace(/\s+/g, " ").trim();
  const hasAction = ACTION_RE.test(cleaned);
  const hasContext = CONTEXT_RE.test(cleaned);
  const hasResult = RESULT_RE.test(cleaned);
  const hasMetric = METRIC_RE.test(cleaned);
  const isWeak = cleaned.length < 8 || WEAK_RE.test(cleaned) || NEGATIVE_RE.test(cleaned);

  let strength: AnswerEvidenceQuality["strength"] = "weak";
  if (!isWeak) {
    if (hasAction && hasContext && hasResult && hasMetric) strength = "strong";
    else if (hasAction && hasContext && hasResult) strength = "good";
    else if (hasAction && (hasContext || hasResult)) strength = "basic";
    else strength = "weak";
  }

  const missing: EvidenceQualityField[] = [];
  if (!hasContext) missing.push("context");
  if (!hasAction) missing.push("action");
  if (!hasResult) missing.push("result");
  if (!hasMetric) missing.push("metric");

  return { hasContext, hasAction, hasResult, hasMetric, strength, missing };
}

export function shouldAskForResultRefinement(answer: string): boolean {
  const quality = evaluateAnswerEvidenceQuality(answer);
  return (
    (quality.strength === "basic" || (quality.hasAction && quality.hasContext)) &&
    !quality.hasResult &&
    !quality.hasMetric
  );
}

export function buildResultRefinementQuestion(args: {
  question?: string;
  jobAdReference?: string;
  capabilityId?: string;
  requirementText?: string;
  answer?: string;
}): string {
  const text = [args.question, args.jobAdReference, args.capabilityId, args.requirementText, args.answer]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(email|campaign|newsletter|automation|onboarding|customer list|outreach|follow-up|follow up|crm|pipeline)\b/.test(text)) {
    return "Did that improve anything measurable or noticeable, like engagement, replies, onboarding completion, customer clarity, fewer support questions, or faster follow-up?";
  }
  if (/\b(account|client|customer|relationship|retention|renewal|sales|support)\b/.test(text)) {
    return "What improved because of that work, such as retention, response time, customer satisfaction, repeat business, or fewer missed follow-ups?";
  }
  if (/\b(powerpoint|slide|deck|presentation|proposal|sales material|report)\b/.test(text)) {
    return "What were those materials used for, client proposals, sales meetings, training, reporting, or stakeholder updates, and did they help clarify decisions, win work, or speed up approvals?";
  }
  if (/\b(project|timeline|deadline|coordinate|vendor|scope|budget|cost|profit|margin)\b/.test(text)) {
    return "What improved because of that coordination, such as staying on schedule, controlling costs, reducing confusion, or keeping scope clear?";
  }
  if (/\b(tool|excel|spreadsheet|system|platform|tracking)\b/.test(text)) {
    return "What did those tools help you improve, track, speed up, or keep organized?";
  }
  if (/\b(template|brand|accuracy|consistency|compliance|communication)\b/.test(text)) {
    return "Did that improve consistency, accuracy, brand alignment, customer clarity, or reduce repeated questions?";
  }

  return "What changed or improved because of that work, even qualitatively?";
}

export function extractImpactPhrase(answer: string): string | null {
  const cleaned = answer.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const metricMatch = cleaned.match(/(?:improved|reduced|increased|saved|grew|won|cut|raised|handled|managed|supported|served|tracked|created|sent|built|completed)[^.!?]*(?:\d+(?:\.\d+)?\s*(?:%|percent|hours?|days?|weeks?|months?|years?|clients?|accounts?|projects?|campaigns?|emails?|leads?|decks?|reports?|orders?|tickets?)|\$\s?\d|\d+x)[^.!?]*/i);
  if (metricMatch) return polishImpactClause(metricMatch[0]);

  const resultMatch = cleaned.match(/(?:improved|reduced|increased|clarified|kept|prevented|resolved|helped|supported|led to|resulted in|so that|which helped)[^.!?]*/i);
  if (resultMatch) return polishImpactClause(resultMatch[0]);

  return null;
}

export function qualitativeImpactForText(text: string): string {
  const lowered = text.toLowerCase();
  if (/\b(email|campaign|newsletter|automation|onboarding)\b/.test(lowered)) {
    return "improving communication clarity and reducing friction during onboarding";
  }
  if (/\b(account|client|customer|relationship|retention|renewal)\b/.test(lowered)) {
    return "keeping follow-ups, expectations, and communication workflows moving";
  }
  if (/\b(project|timeline|deadline|coordinate|vendor|schedule)\b/.test(lowered)) {
    return "keeping work on schedule and reducing missed follow-ups";
  }
  if (/\b(budget|scope|cost|profit|profitability|margin|pricing)\b/.test(lowered)) {
    return "keeping scope, costs, and timelines clear";
  }
  if (/\b(powerpoint|slide|deck|presentation|proposal|sales material|report)\b/.test(lowered)) {
    return "clarifying decisions and supporting faster approvals";
  }
  if (/\b(template|brand|accuracy|consistency|compliance|communication)\b/.test(lowered)) {
    return "improving consistency and reducing communication errors";
  }
  if (/\b(tool|excel|spreadsheet|system|platform|tracking|crm|pipeline)\b/.test(lowered)) {
    return "improving visibility and reducing missed details";
  }
  return "improving clarity, consistency, and follow-through";
}

function polishImpactClause(value: string): string {
  return value
    .replace(/^\s*(and|which|that|so)\s+/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}
