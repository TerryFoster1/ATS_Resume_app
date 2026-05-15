import type { JobRequirement } from "../types";
import { hasMetaAdsPlatformSignal } from "./platformSynonyms";

export type JobAdItemType =
  | "requirement_hard"
  | "requirement_soft"
  | "preferred_qualification"
  | "responsibility"
  | "tool_or_platform"
  | "industry_experience"
  | "education_requirement"
  | "years_experience"
  | "company_mission"
  | "company_values"
  | "diversity_statement"
  | "benefits"
  | "application_instruction"
  | "location"
  | "salary"
  | "company_description"
  | "product_description"
  | "employer_context"
  | "marketing_copy"
  | "unknown_ignore";

export type ClassifiedJobAdItem = {
  rawText: string;
  detectedSection?: string;
  classifiedType: JobAdItemType;
  confidence: number;
  includedInScoring: boolean;
  includedInQuestions: boolean;
  suppressionReason?: string;
};

const MIN_CONFIDENCE = 0.75;

const ALLOWED_FOR_SCORING: JobAdItemType[] = [
  "requirement_hard",
  "requirement_soft",
  "preferred_qualification",
  "tool_or_platform",
  "industry_experience",
  "education_requirement",
  "years_experience",
  "responsibility"
];

const ALLOWED_FOR_QUESTIONS: JobAdItemType[] = [
  "requirement_hard",
  "preferred_qualification",
  "tool_or_platform",
  "industry_experience",
  "education_requirement",
  "years_experience",
  "responsibility"
];

type SectionBias = "requirements" | "responsibilities" | "company" | "benefits" | "legal" | "metadata" | "unknown";

export function classifyJobAdItem(
  text: string,
  requirement?: Pick<JobRequirement, "kind" | "intent" | "importance">,
  jobPostText?: string
): JobAdItemType {
  return classifyJobAdItemDetailed(text, requirement, jobPostText).classifiedType;
}

export function classifyJobAdItemDetailed(
  text: string,
  requirement?: Pick<JobRequirement, "kind" | "intent" | "importance">,
  jobPostText?: string
): ClassifiedJobAdItem {
  const rawText = normalizeText(text);
  const detectedSection = findSectionForText(rawText, jobPostText);
  const sectionBias = classifySectionBias(detectedSection);
  const classification = classifyStrict(rawText, requirement, sectionBias);
  const includedInScoring =
    classification.confidence >= MIN_CONFIDENCE &&
    ALLOWED_FOR_SCORING.includes(classification.classifiedType);
  const includedInQuestions =
    classification.confidence >= MIN_CONFIDENCE &&
    ALLOWED_FOR_QUESTIONS.includes(classification.classifiedType);

  const suppressionReason = includedInScoring
    ? undefined
    : classification.confidence < MIN_CONFIDENCE
      ? `Excluded because classification confidence ${classification.confidence.toFixed(2)} is below ${MIN_CONFIDENCE}.`
      : `Excluded as ${classification.classifiedType}.`;

  return {
    rawText,
    detectedSection,
    classifiedType: classification.classifiedType,
    confidence: classification.confidence,
    includedInScoring,
    includedInQuestions,
    suppressionReason
  };
}

export function getRequirementSuppressionReason(
  requirement: JobRequirement,
  jobPostText?: string
): string | undefined {
  const item = classifyJobAdItemDetailed(requirement.text, requirement, jobPostText);
  if (!item.includedInScoring) return item.suppressionReason;
  if (requirement.intent === "IGNORE") return "Requirement intent is IGNORE.";
  return undefined;
}

export function getQuestionSuppressionReason(
  requirement: JobRequirement,
  jobPostText?: string
): string | undefined {
  const item = classifyJobAdItemDetailed(requirement.text, requirement, jobPostText);
  if (!item.includedInQuestions) {
    if (item.classifiedType === "requirement_soft" && isTranslatableSoftSkill(item.rawText)) {
      return undefined;
    }
    return item.confidence < MIN_CONFIDENCE
      ? `Excluded from questions because classification confidence ${item.confidence.toFixed(2)} is below ${MIN_CONFIDENCE}.`
      : `Excluded from questions as ${item.classifiedType}.`;
  }
  if (requirement.intent === "IGNORE") return "Requirement intent is IGNORE.";
  return undefined;
}

export function isQuestionableRequirement(requirement: JobRequirement): boolean {
  return getQuestionSuppressionReason(requirement) === undefined;
}

export function isQuestionableJobAdText(text: string, jobPostText?: string): boolean {
  return classifyJobAdItemDetailed(text, undefined, jobPostText).includedInQuestions;
}

export function validateQuestionForCandidate(args: {
  question: string;
  jobAdReference: string;
  requirement?: JobRequirement;
  jobPostText?: string;
}): { passed: boolean; reason?: string } {
  const question = normalizeText(args.question);
  const reference = normalizeText(args.jobAdReference);

  if (!question || !reference) return { passed: false, reason: "Missing question or job-ad reference." };

  if (hasBannedQuestionWording(question.toLowerCase())) {
    return { passed: false, reason: "Question uses banned generic wording." };
  }

  const referenceItem = classifyJobAdItemDetailed(reference, args.requirement, args.jobPostText);
  const translatableSoftReference =
    referenceItem.classifiedType === "requirement_soft" && isTranslatableSoftSkill(referenceItem.rawText);
  if (!referenceItem.includedInQuestions && !translatableSoftReference) {
    return {
      passed: false,
      reason: referenceItem.confidence < MIN_CONFIDENCE
        ? `Reference confidence ${referenceItem.confidence.toFixed(2)} is below ${MIN_CONFIDENCE}.`
        : `Reference classified as ${referenceItem.classifiedType}.`
    };
  }

  if (isQuestionRepeatingReference(question, reference)) {
    return { passed: false, reason: "Question repeats the job-ad wording instead of asking for evidence." };
  }

  if (asksPersonalityClaim(question)) {
    return { passed: false, reason: "Question asks for a personality claim instead of work evidence." };
  }

  if (!asksForEvidence(question)) {
    return { passed: false, reason: "Question does not ask for resume-grade evidence." };
  }

  if (!hasConcreteWorkSignal(question)) {
    return { passed: false, reason: "Question is not grounded in concrete work evidence." };
  }

  return { passed: true };
}

export function logJobAdItemDiagnostics(
  requirements: JobRequirement[],
  jobPostText?: string
): void {
  if (process.env.NODE_ENV === "production") return;
  console.table(
    requirements.map((requirement) => {
      const item = classifyJobAdItemDetailed(requirement.text, requirement, jobPostText);
      return {
        rawText: item.rawText,
        detectedSection: item.detectedSection ?? "",
        classifiedType: item.classifiedType,
        confidence: item.confidence,
        included_in_scoring: item.includedInScoring,
        included_in_questions: item.includedInQuestions,
        suppressionReason: item.suppressionReason ?? "",
        questionSuppressionReason: item.includedInQuestions
          ? ""
          : getQuestionSuppressionReason(requirement, jobPostText) ?? "",
        question_quality_hint: item.includedInQuestions
          ? "eligible"
          : "suppressed"
      };
    })
  );
}

function classifyStrict(
  text: string,
  requirement: Pick<JobRequirement, "kind" | "intent" | "importance"> | undefined,
  sectionBias: SectionBias
): Pick<ClassifiedJobAdItem, "classifiedType" | "confidence"> {
  const lowered = text.toLowerCase();
  const wordCount = lowered.split(/\s+/).filter(Boolean).length;

  if (!text) return { classifiedType: "unknown_ignore", confidence: 1 };
  if (isDiversityStatement(lowered)) return { classifiedType: "diversity_statement", confidence: 0.98 };
  if (isApplicationInstruction(lowered, sectionBias)) return { classifiedType: "application_instruction", confidence: 0.96 };
  if (isBenefitsOrCompensation(lowered, sectionBias)) return { classifiedType: "benefits", confidence: 0.96 };
  if (isSalary(lowered)) return { classifiedType: "salary", confidence: 0.98 };
  if (isLocation(lowered)) return { classifiedType: "location", confidence: 0.96 };
  if (isCompanyMission(lowered, sectionBias)) return { classifiedType: "company_mission", confidence: 0.98 };
  if (isCompanyValues(lowered, sectionBias)) return { classifiedType: "company_values", confidence: 0.95 };
  if (isRecruiterPreferenceFluff(lowered)) return { classifiedType: "marketing_copy", confidence: 0.92 };
  if (isCompanyOrProductDescription(lowered, sectionBias)) {
    return { classifiedType: productLanguageScore(lowered) > 0 ? "product_description" : "company_description", confidence: 0.94 };
  }
  if (isMarketingCopy(lowered, sectionBias)) return { classifiedType: "marketing_copy", confidence: 0.9 };
  if (isJobMetadata(lowered, wordCount)) return { classifiedType: "unknown_ignore", confidence: 0.9 };

  if (requirement?.intent === "IGNORE") return { classifiedType: "unknown_ignore", confidence: 0.95 };
  if (requirement?.intent === "PREFERRED") return { classifiedType: "preferred_qualification", confidence: 0.9 };
  if (requirement?.kind === "CERTIFICATION") return { classifiedType: "requirement_hard", confidence: 0.94 };
  if (requirement?.kind === "TOOL") return { classifiedType: "tool_or_platform", confidence: 0.92 };
  if (requirement?.kind === "EDUCATION") return { classifiedType: "education_requirement", confidence: 0.92 };
  if (requirement?.kind === "EXPERIENCE_YEARS") return { classifiedType: "years_experience", confidence: 0.94 };
  if (requirement?.kind === "INDUSTRY") return { classifiedType: "industry_experience", confidence: 0.88 };
  if (requirement?.intent === "MUST_HAVE") return { classifiedType: "requirement_hard", confidence: 0.9 };

  if (isHardRequirement(lowered)) return { classifiedType: "requirement_hard", confidence: 0.92 };
  if (isToolOrPlatform(lowered)) return { classifiedType: "tool_or_platform", confidence: 0.88 };
  if (isEducationRequirement(lowered)) return { classifiedType: "education_requirement", confidence: 0.88 };
  if (isYearsExperience(lowered)) return { classifiedType: "years_experience", confidence: 0.94 };
  if (isIndustryExperience(lowered)) return { classifiedType: "industry_experience", confidence: 0.84 };
  if (isPreferredQualification(lowered)) return { classifiedType: "preferred_qualification", confidence: 0.86 };

  if (hasResponsibilitySignal(lowered)) {
    const confidence = sectionBias === "responsibilities" || sectionBias === "requirements" ? 0.82 : 0.76;
    return { classifiedType: "responsibility", confidence };
  }

  if (isSoftRequirement(lowered)) return { classifiedType: "requirement_soft", confidence: 0.82 };

  if (sectionBias === "company" || sectionBias === "benefits" || sectionBias === "legal") {
    return { classifiedType: "marketing_copy", confidence: 0.82 };
  }

  return { classifiedType: "unknown_ignore", confidence: 0.8 };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/^[•*\-–—\d.)\s]+/, "").trim();
}

function findSectionForText(text: string, jobPostText?: string): string | undefined {
  if (!jobPostText || !text) return undefined;
  const normalizedTarget = normalizeText(text).toLowerCase();
  const lines = jobPostText.split(/\r?\n/).map((line) => normalizeText(line)).filter(Boolean);
  let currentSection = "";
  for (const line of lines) {
    if (isLikelySectionHeading(line)) {
      currentSection = line;
      continue;
    }
    const lowered = line.toLowerCase();
    if (
      lowered.includes(normalizedTarget) ||
      normalizedTarget.includes(lowered) ||
      overlapScore(lowered, normalizedTarget) >= 0.72
    ) {
      return currentSection || undefined;
    }
  }
  return undefined;
}

function isLikelySectionHeading(line: string): boolean {
  const lowered = line.toLowerCase().replace(/[:]+$/, "");
  if (line.length > 72) return false;
  return /^(about us|who we are|our mission|our purpose|our values|why join us|company overview|what we offer|benefits|perks|compensation|salary|diversity|equal opportunity|application|how to apply|requirements|qualifications|experience|skills|what we're looking for|what we are looking for|your responsibilities|responsibilities|what you'll do|what you will do|role responsibilities|required qualifications|preferred qualifications)$/i.test(
    lowered
  );
}

function classifySectionBias(section?: string): SectionBias {
  const lowered = section?.toLowerCase() ?? "";
  if (!lowered) return "unknown";
  if (/\b(about us|who we are|our mission|our purpose|our values|why join us|company overview)\b/.test(lowered)) return "company";
  if (/\b(what we offer|benefits|perks|compensation|salary)\b/.test(lowered)) return "benefits";
  if (/\b(diversity|equal opportunity|accessibility|accommodation)\b/.test(lowered)) return "legal";
  if (/\b(application|how to apply)\b/.test(lowered)) return "metadata";
  if (/\b(responsibilities|what you'll do|what you will do|role responsibilities)\b/.test(lowered)) return "responsibilities";
  if (/\b(requirements|qualifications|experience|skills|what we're looking for|what we are looking for|required qualifications|preferred qualifications)\b/.test(lowered)) {
    return "requirements";
  }
  return "unknown";
}

function overlapScore(a: string, b: string): number {
  const aWords = new Set(a.split(/\W+/).filter((word) => word.length > 3));
  const bWords = new Set(b.split(/\W+/).filter((word) => word.length > 3));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let overlap = 0;
  for (const word of aWords) {
    if (bWords.has(word)) overlap += 1;
  }
  return overlap / Math.min(aWords.size, bWords.size);
}

function isCompanyMission(text: string, sectionBias: SectionBias): boolean {
  return (
    /\b(join us|join ey|join us in our fight|our mission is|our purpose is|our vision is|help to build a better working world|help build a better working world|build a better working world|working world|better working world|make access to|right and not a privilege|highest quality hygiene|wellness.*right|nourishment a right|improve lives|change lives|make the world|change the world|make an impact|make a difference)\b/.test(text) ||
    (sectionBias === "company" && /\b(join|help|believe|purpose|mission|world|community|society|people|future)\b/.test(text) && !hasCandidateRequirementSignal(text))
  );
}

function isCompanyValues(text: string, sectionBias: SectionBias): boolean {
  return (
    /\b(we believe|we are committed|we run on|our values|you belong|you belong here|life at|culture|culture of|inclusive culture|what we stand for|we strive|we care|our people|our teams|equity|inclusion)\b/.test(text) ||
    (sectionBias === "company" && /\b(values|culture|belong|committed|inclusive|integrity|respect|collaboration)\b/.test(text) && !hasCandidateRequirementSignal(text))
  );
}

function isRecruiterPreferenceFluff(text: string): boolean {
  return /\b(want a real career path|want to be coached|improve fast|like solving problems|great fit if|you're likely a great fit|you are likely a great fit|coachable attitude|high standards for yourself)\b/.test(text);
}

function isMarketingCopy(text: string, sectionBias: SectionBias): boolean {
  if (sectionBias !== "company" && sectionBias !== "unknown") return false;
  return /\b(leading global|world-class|award-winning|trusted by|we help|we bring|empower|transform|innovation|innovative|journey|join us|together we|at .+ we|proud to|passionate about)\b/.test(text) && !hasCandidateRequirementSignal(text);
}

function isCompanyOrProductDescription(text: string, sectionBias: SectionBias): boolean {
  const employerSubject =
    /\b(?:[a-z0-9&.'-]+\s+)?(?:is|are)\s+(?:a|an|the)\s+.*\b(company|agency|platform|provider|business|firm|organization|organisation|startup|scaleup|saas|software company)\b/.test(text) ||
    /\b(our platform|our product|our software|our service|the company provides|the company offers|we provide|we offer|we help|helping .+ scale|helps businesses|helps clients|enables .+ to|proven .+ system)\b/.test(text);
  const asksCandidate =
    /\b(experience with|proficiency in|proficient in|familiarity with|you will use|you have used|candidate must|must have|required|responsible for using|comfortable with)\b/.test(text);
  if (asksCandidate) return false;
  return employerSubject || (sectionBias === "company" && productLanguageScore(text) > 0);
}

function productLanguageScore(text: string): number {
  const signals = [
    /\badvertising\s*\+\s*software company\b/,
    /\bsoftware company\b/,
    /\bsaas company\b/,
    /\bour platform\b/,
    /\bour product\b/,
    /\bour software\b/,
    /\bproven webinar lead generation system\b/,
    /\bhelps? .+ (scale|grow|automate|manage)\b/,
    /\benables? .+ to\b/
  ];
  return signals.reduce((count, signal) => count + (signal.test(text) ? 1 : 0), 0);
}

function isDiversityStatement(text: string): boolean {
  return /\b(equal opportunity|diversity|inclusion|inclusive|accessibility|accommodation|disability|gender identity|sexual orientation|protected veteran|human rights|we welcome applications)\b/.test(text);
}

function isApplicationInstruction(text: string, sectionBias: SectionBias): boolean {
  return sectionBias === "metadata" || /\b(apply now|submit your application|to apply|application process|send your resume|cover letter|we thank all applicants|only candidates selected|recruitment process|click apply)\b/.test(text);
}

function isBenefitsOrCompensation(text: string, sectionBias: SectionBias): boolean {
  return sectionBias === "benefits" || /\b(benefits|perks|vacation|bonus|pension|rrsp|health benefits|dental|paid time off|employee discount|wellness program|we offer|you will receive|total rewards|salary)\b/.test(text);
}

function isSalary(text: string): boolean {
  return /\b(salary|compensation|pay range|hourly rate|\$\s?\d|cad\s?\d|bonus)\b/.test(text);
}

function isLocation(text: string): boolean {
  return (
    /\b(mississauga|toronto|kitchener|waterloo|ontario|canada|remote|hybrid|on-site|onsite|new york|vancouver|calgary|montreal|ottawa)\b/.test(text) &&
    !hasCandidateRequirementSignal(text) &&
    text.split(/\s+/).filter(Boolean).length <= 10
  );
}

function isJobMetadata(text: string, wordCount: number): boolean {
  if (/\b(full[-\s]?time|part[-\s]?time|temporary|permanent|contract|fixed[-\s]?term|internship|co-?op|15[-\s]?month|12[-\s]?month)\b/.test(text) && !hasCandidateRequirementSignal(text)) {
    return true;
  }
  if (/\b(people leader|hiring manager|reports to|reporting to|vp\b|vice president|department|business unit|job id|requisition)\b/.test(text)) {
    return true;
  }
  if (
    wordCount <= 6 &&
    /\b(specialist|manager|coordinator|analyst|director|lead|associate|assistant|representative|consultant)\b/.test(text) &&
    !/\b(experience|proficiency)\b/.test(text) &&
    !hasMetaAdsPlatformSignal(text) &&
    !hasCandidateRequirementSignal(text)
  ) {
    return true;
  }
  return false;
}

function isHardRequirement(text: string): boolean {
  return /\b(required|must have|must be|minimum|required to|valid|license|licence|certification|certified|credential|eligible|legally authorized|clearance|driver'?s license|trade certificate|red seal|apprenticeship)\b/.test(text);
}

function isToolOrPlatform(text: string): boolean {
  if (isCompanyOrProductDescription(text, "unknown")) return false;
  return hasMetaAdsPlatformSignal(text) || /\b(excel|powerpoint|office 365|microsoft office|google workspace|crm|salesforce|hubspot|google analytics|quickbooks|software|platform|system|tool|analytics platform|dashboards?|kpis?|metrics?|tableau|power bi|sql|python|jira|asana|workday|sap|oracle)\b/.test(text);
}

function isEducationRequirement(text: string): boolean {
  return /\b(degree|diploma|college|university|post-secondary|post secondary|education|bachelor|master|mba|certificate program)\b/.test(text);
}

function isYearsExperience(text: string): boolean {
  return /\b\d+\+?\s*(?:years?|yrs?)\b|\bminimum of \d+\b|\bat least \d+\b|\bentry[-\s]?level\b/.test(text);
}

function isIndustryExperience(text: string): boolean {
  return /\b(experience in|background in|knowledge of).*\b(industry|sector|insurance|finance|healthcare|saas|retail|construction|plumbing|manufacturing|marketing|social media|nonprofit|fundraising)\b/.test(text);
}

function isPreferredQualification(text: string): boolean {
  return /\b(preferred|asset|nice to have|bonus|plus|considered an asset|would be an asset)\b/.test(text);
}

function isSoftRequirement(text: string): boolean {
  return /\b(ability to|strong|excellent|effective|skilled|proficiency|proficient|knowledge of|experience with|familiarity|expertise|comfort with|comfortable with|communication|collaboration|organized|proactive|smart|time management|problem solving|attention to detail|detail[-\s]?oriented|fast[-\s]?paced|leadership|analytical|creative|stakeholder)\b/.test(text);
}

function hasResponsibilitySignal(text: string): boolean {
  return /\b(develop|maintain|manage|coordinate|create|build|analyze|report|track|support|lead|deliver|execute|monitor|prepare|review|implement|optimize|collaborate|communicate|ensure|deploy|produce|service|sell|operate|demonstrate|onboard|train|troubleshoot|spot|improve)\b/.test(text);
}

function hasCandidateRequirementSignal(text: string): boolean {
  return (
    isHardRequirement(text) ||
    isToolOrPlatform(text) ||
    isEducationRequirement(text) ||
    isYearsExperience(text) ||
    isPreferredQualification(text) ||
    isSoftRequirement(text) ||
    /\b(candidate|applicant|you have|you bring|you are able|your experience|qualified|qualification|responsible for|you will|must|required|skills?|experience)\b/.test(text)
  );
}

function isPersonalityOnlySoftSkill(text: string): boolean {
  const lowered = text.toLowerCase();
  if (hasResponsibilitySignal(lowered) || isToolOrPlatform(lowered) || isHardRequirement(lowered)) return false;
  return /\b(smart|organized|proactive|detail[-\s]?oriented|collaborative|analytical|creative|fast[-\s]?paced|excellent communication|strong communication|leadership|team player|self[-\s]?starter)\b/.test(lowered);
}

function hasBannedQuestionWording(question: string): boolean {
  return /\b(have you done work related to|what experience do you have with\s*["']|can you describe your professional experience with\s*["']|what relevant experience should we emphasize|what truthful detail|truthful detail|what should we emphasize|this requirement)\b/.test(question);
}

function asksForEvidence(question: string): boolean {
  return /\b(have you|how proficient|what did you|what were you|what systems|what tools|do you currently|did you|what education|how many years)\b/i.test(question);
}

function hasConcreteWorkSignal(question: string): boolean {
  return /\b(tool|platform|system|workflow|handoff|documentation|follow-up|timeline|deliverable|stakeholder|client|customer|member|account|lead|pipeline|sales|communication|presentation|onboarding|content|sop|report|dashboard|analytics|spreadsheet|kpi|budget|cost|forecast|margin|team|staff|process|operation|campaign|brand|research|market|quality|accuracy|compliance|license|certification|education|training|field|site|install|repair|maintain|inspect|outcome|improve|support|manage|coordinate|create|build|analyze|review|track|develop|execute)\b/i.test(question);
}

function asksPersonalityClaim(question: string): boolean {
  return /\b(are you|would you describe yourself|can you say you are)\b.*\b(smart|organized|organised|proactive|detail[-\s]?oriented|collaborative|analytical|creative|adaptable|team player|self[-\s]?starter)\b/i.test(question);
}

function isQuestionRepeatingReference(question: string, reference: string): boolean {
  const normalizedQuestion = normalizeForOverlap(question);
  const normalizedReference = normalizeForOverlap(reference);
  if (!normalizedQuestion || !normalizedReference) return false;
  if (question.includes(`"${reference}"`) || question.includes(`'${reference}'`)) return true;
  return overlapScore(normalizedQuestion, normalizedReference) >= 0.82;
}

function normalizeForOverlap(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(have|you|what|with|for|this|that|and|or|the|a|an|do|did|does|professionally|experience)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTranslatableSoftSkill(text: string): boolean {
  const lowered = text.toLowerCase();
  return isPersonalityOnlySoftSkill(lowered) || /\b(communicat|organized|organised|proactive|detail[-\s]?oriented|analytical|leadership|collaborative|creative|adaptable|fast[-\s]?paced|high standards)\b/.test(lowered);
}
