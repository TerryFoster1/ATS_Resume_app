import type { JobRequirement } from "../types";
import {
  classifyJobAdItemDetailed,
  type JobAdItemType
} from "./jobAdItems";
import { canonicalPlatformLabel, hasMetaAdsPlatformSignal } from "./platformSynonyms";

export type RequirementIntent =
  | "credential_or_license"
  | "education"
  | "years_experience"
  | "tool_or_platform"
  | "technical_skill"
  | "domain_experience"
  | "workflow_experience"
  | "project_management"
  | "customer_or_client_management"
  | "sales_or_pipeline"
  | "communication"
  | "writing_or_documentation"
  | "analytics_or_reporting"
  | "financial_or_budgeting"
  | "leadership_or_people_management"
  | "operations_or_process"
  | "creative_or_content"
  | "research_or_strategy"
  | "compliance_or_quality"
  | "physical_or_field_work"
  | "soft_trait"
  | "company_mission"
  | "metadata"
  | "ignore";

export type RequirementQuestionInterpretation = {
  originalText: string;
  sourceSection?: string;
  requirementType: JobAdItemType;
  inferredIntent: RequirementIntent;
  evidenceNeeded: string;
  questionText: string;
  whyText: string;
  jobAdQuote: string;
  confidence: number;
  shouldAsk: boolean;
  suppressionReason?: string;
};

const MIN_QUESTION_CONFIDENCE = 0.75;

const TITLE_BY_INTENT: Record<RequirementIntent, string> = {
  credential_or_license: "Required credential or license",
  education: "Education, training, or equivalent experience",
  years_experience: "Relevant experience level",
  tool_or_platform: "Tools and platforms",
  technical_skill: "Technical or hands-on skill",
  domain_experience: "Industry or domain experience",
  workflow_experience: "Workflow ownership and follow-through",
  project_management: "Project and stakeholder coordination",
  customer_or_client_management: "Client or customer management",
  sales_or_pipeline: "Sales, outreach, or pipeline work",
  communication: "Professional communication",
  writing_or_documentation: "Writing and documentation",
  analytics_or_reporting: "Analytics and reporting",
  financial_or_budgeting: "Budgets, costs, or financial tracking",
  leadership_or_people_management: "Leadership or people coordination",
  operations_or_process: "Operations and process improvement",
  creative_or_content: "Creative or content execution",
  research_or_strategy: "Research, insight, and strategy",
  compliance_or_quality: "Accuracy, compliance, or quality review",
  physical_or_field_work: "Hands-on or field work",
  soft_trait: "Observable work habits",
  company_mission: "Company mission",
  metadata: "Job metadata",
  ignore: "Ignored job-ad copy"
};

export function interpretRequirementForQuestion(
  requirement: JobRequirement,
  jobPostText?: string
): RequirementQuestionInterpretation {
  return interpretTextForQuestion(requirement.text, requirement, jobPostText);
}

export function interpretTextForQuestion(
  text: string,
  requirement?: JobRequirement,
  jobPostText?: string
): RequirementQuestionInterpretation {
  const originalText = normalizeText(text);
  const classified = classifyJobAdItemDetailed(originalText, requirement, jobPostText);
  const inferredIntent = inferIntent(originalText, requirement, classified.classifiedType);
  const suppressionReason = suppressionReasonFor(classified.classifiedType, inferredIntent, classified.confidence);
  const shouldAsk = !suppressionReason;
  const questionText = isConcreteQuestionIntent(inferredIntent)
    ? questionForIntent(inferredIntent, originalText)
    : "";

  return {
    originalText,
    sourceSection: classified.detectedSection,
    requirementType: classified.classifiedType,
    inferredIntent,
    evidenceNeeded: shouldAsk ? evidenceNeededForIntent(inferredIntent, originalText) : "",
    questionText,
    whyText: shouldAsk
      ? reasonForIntent(inferredIntent, originalText)
      : suppressionReason ?? "This item is not a candidate-facing requirement.",
    jobAdQuote: originalText,
    confidence: confidenceForIntent(classified.confidence, inferredIntent),
    shouldAsk,
    suppressionReason
  };
}

export function titleForIntent(intent: RequirementIntent, fallbackText: string): string {
  return TITLE_BY_INTENT[intent] ?? shortTitle(fallbackText);
}

export function keyForIntent(intent: RequirementIntent, text: string): string {
  const normalized = normalizeKey(text);
  switch (intent) {
    case "credential_or_license":
      return "credential-or-license";
    case "education":
      return "education-or-training";
    case "years_experience":
      return "relevant-experience-years";
    case "tool_or_platform":
      return `tool-platform-${extractTool(text).toLowerCase().replace(/[^a-z0-9]+/g, "-") || normalized}`;
    case "technical_skill":
      return "technical-skill";
    case "domain_experience":
      return "domain-experience";
    case "workflow_experience":
      return "workflow-documentation-follow-up";
    case "project_management":
      return "project-management";
    case "customer_or_client_management":
      return "customer-client-management";
    case "sales_or_pipeline":
      return "sales-pipeline-outreach";
    case "communication":
      return "communication";
    case "writing_or_documentation":
      return "writing-documentation";
    case "analytics_or_reporting":
      return "analytics-reporting";
    case "financial_or_budgeting":
      return "financial-budgeting";
    case "leadership_or_people_management":
      return "leadership-people-management";
    case "operations_or_process":
      return "operations-process";
    case "creative_or_content":
      return "creative-content";
    case "research_or_strategy":
      return "research-strategy";
    case "compliance_or_quality":
      return "compliance-quality";
    case "physical_or_field_work":
      return "physical-field-work";
    case "soft_trait":
      return "observable-work-habits";
    default:
      return `ignored-${normalized}`;
  }
}

export function isConcreteQuestionIntent(intent: RequirementIntent): boolean {
  return !["company_mission", "metadata", "ignore"].includes(intent);
}

function inferIntent(
  text: string,
  requirement: JobRequirement | undefined,
  type: JobAdItemType
): RequirementIntent {
  const lowered = text.toLowerCase();

  if (["company_mission", "company_values", "marketing_copy"].includes(type)) return "company_mission";
  if (["company_description", "product_description", "employer_context", "benefits", "diversity_statement", "application_instruction", "location", "salary", "unknown_ignore"].includes(type)) {
    return "metadata";
  }

  if (requirement?.kind === "CERTIFICATION" || /\b(license|licence|licensed|certification|certified|credential|red seal|apprentice|apprenticeship|journeyperson|journeyman)\b/.test(lowered)) {
    return "credential_or_license";
  }
  if (requirement?.kind === "EDUCATION" || /\b(degree|diploma|college|university|post-secondary|post secondary|education|bachelor|master|certificate program|training)\b/.test(lowered)) {
    return "education";
  }
  if (requirement?.kind === "EXPERIENCE_YEARS" || /\b\d+\+?\s*(?:years?|yrs?)\b|\bminimum of \d+\b|\bat least \d+\b|\bentry[-\s]?level\b/.test(lowered)) {
    return "years_experience";
  }
  if (hasMetaAdsPlatformSignal(lowered)) {
    return "tool_or_platform";
  }
  if (requirement?.kind === "TOOL" || /\b(excel|powerpoint|office 365|microsoft office|google workspace|crm|salesforce|hubspot|mailchimp|marketo|tableau|power bi|sql|python|quickbooks|jira|asana|workday|sap|oracle|platform|software|system|tool)\b/.test(lowered)) {
    return "tool_or_platform";
  }
  if (/\b(plumb|pipefitt|fixture|water heater|drain|sewer|gas line|install|repair|maintain|inspection|site|field|hands-on|trade)\b/.test(lowered)) {
    return "physical_or_field_work";
  }
  if (/\b(technical|troubleshoot|bug|engineering|maintain|repair|support systems|configure|build|database|code|software)\b/.test(lowered)) {
    return "technical_skill";
  }
  if (/\b(industry|sector|insurance|finance|healthcare|saas|retail|construction|manufacturing|hospitality|nonprofit|fundraising|real estate|mortgage)\b/.test(lowered)) {
    return "domain_experience";
  }
  if (/\b(budget|cost|forecast|pricing|margin|profitability|profit|invoice|p&l|revenue|financial)\b/.test(lowered)) {
    return "financial_or_budgeting";
  }
  if (/\b(report|dashboard|analytics|data|metric|kpi|performance|insight|spreadsheet|recommendation|measure|tracking)\b/.test(lowered)) {
    return "analytics_or_reporting";
  }
  if (/\b(compliance|quality|accuracy|privacy|safety|policy|regulatory|standard|review|brand alignment|brand standards|audit|risk)\b/.test(lowered)) {
    return "compliance_or_quality";
  }
  if (/\b(training guide|sop|documentation|document|proposal|faq|email|written|write|content|instructions|report|template|templated)\b/.test(lowered)) {
    return "writing_or_documentation";
  }
  if (/\b(campaign|brand|social media|video|design|creative|messaging|channel|audience|retail|digital|trade|content)\b/.test(lowered)) {
    return "creative_or_content";
  }
  if (/\b(research|strategy|market|customer insight|consumer insight|competitor|trend|user|audience insight)\b/.test(lowered)) {
    return "research_or_strategy";
  }
  if (/\b(lead|outreach|sales|prospect|pipeline|renewal|quote|crm record|follow-up|follow up|business development)\b/.test(lowered)) {
    return "sales_or_pipeline";
  }
  if (/\b(client|customer|member|guest|donor|partner|account|onboard|train|support|service|relationship)\b/.test(lowered)) {
    return "customer_or_client_management";
  }
  if (/\b(project|timeline|deliverable|stakeholder|cross-functional|cross functional|vendor|planning|execution|coordinate|coordination|schedule)\b/.test(lowered)) {
    return "project_management";
  }
  if (/\b(workflow|handoff|follow-up|follow up|documentation|records|checklist|approval|process|repeatable|organized|proactive|time management)\b/.test(lowered)) {
    return "workflow_experience";
  }
  if (/\b(leadership|manage a team|manage staff|supervise|mentor|coach|train staff|people management)\b/.test(lowered)) {
    return "leadership_or_people_management";
  }
  if (/\b(operations|operational|standardize|standardise|process|efficien|reduce errors|improve|systematize|systematise)\b/.test(lowered)) {
    return "operations_or_process";
  }
  if (/\b(communicat|presentation|present|client calls|stakeholder updates|conversation|clearly|confidently)\b/.test(lowered)) {
    return "communication";
  }
  if (/\b(smart|organized|organised|proactive|detail[-\s]?oriented|collaborative|analytical|creative|fast[-\s]?paced|high standards|adaptable|self[-\s]?starter|team player)\b/.test(lowered)) {
    return translatedSoftTraitIntent(lowered);
  }

  if (type === "responsibility") return "workflow_experience";
  if (type === "requirement_soft") return "soft_trait";
  return "ignore";
}

function translatedSoftTraitIntent(text: string): RequirementIntent {
  if (/\b(communicat|clearly|confidently)\b/.test(text)) return "communication";
  if (/\b(leadership|collaborative|team player)\b/.test(text)) return "leadership_or_people_management";
  if (/\b(analytical)\b/.test(text)) return "analytics_or_reporting";
  if (/\b(detail[-\s]?oriented|high standards)\b/.test(text)) return "compliance_or_quality";
  if (/\b(creative)\b/.test(text)) return "creative_or_content";
  if (/\b(organized|organised|proactive|adaptable|fast[-\s]?paced|self[-\s]?starter)\b/.test(text)) return "workflow_experience";
  return "soft_trait";
}

function questionForIntent(intent: RequirementIntent, text: string): string {
  switch (intent) {
    case "credential_or_license":
      return `Do you currently hold the required ${credentialName(text)}? If yes, when was it issued and where is it valid?`;
    case "education":
      return "What education, training, certification, or equivalent experience should we use to support this requirement?";
    case "years_experience":
      return `How many years of experience do you have in ${fieldName(text)}, and which roles best show that experience?`;
    case "tool_or_platform":
      if (hasMetaAdsPlatformSignal(text)) {
        return "The posting specifically asks for Facebook Ads Manager experience. Have you managed Meta or Facebook advertising campaigns professionally, even if it is not listed on your resume? What tools or responsibilities were involved?";
      }
      if (/\bcrm\b/i.test(text) && /\b(documentation|records|notes|follow-up|follow up|pipeline|internal systems)\b/i.test(text)) {
        return "Have you maintained CRM records, client notes, follow-up trackers, pipeline updates, or internal documentation? What system did you use?";
      }
      return `How proficient are you with ${extractTool(text)}, and what have you used it for professionally?`;
    case "technical_skill":
      return `Have you used ${technicalSkillName(text)} in a professional setting? What did you build, maintain, analyze, repair, or support?`;
    case "domain_experience":
      return `Have you worked in ${domainName(text)}? What customers, products, regulations, or workflows did you support?`;
    case "workflow_experience":
      return "Have you managed repeatable workflows, handoffs, documentation, scheduling, or follow-up processes? What did the workflow support?";
    case "project_management":
      return "Have you managed timelines, deliverables, stakeholders, or multi-step projects? What were you responsible for?";
    case "customer_or_client_management":
      return "Have you onboarded, supported, trained, or managed clients or customers? What did you help them accomplish?";
    case "sales_or_pipeline":
      return "Have you managed leads, outreach, sales conversations, CRM records, pipeline tracking, renewals, or follow-ups? What system did you use?";
    case "communication":
      return "Have you handled client communication, presentations, onboarding calls, stakeholder updates, or written instructions? What audience were you communicating with?";
    case "writing_or_documentation":
      return "Have you created customer-facing content, SOPs, reports, training guides, proposals, emails, FAQs, or documentation? What was the purpose?";
    case "analytics_or_reporting":
      if (/\b(campaign performance|client progress|track client|progress)\b/i.test(text)) {
        return "Have you tracked client progress, campaign performance, dashboards, KPIs, or basic metrics? What did you monitor?";
      }
      return "Have you used reporting, analytics, dashboards, spreadsheets, KPIs, or performance data to make recommendations or improve outcomes?";
    case "financial_or_budgeting":
      return "Have you tracked budgets, pricing, costs, forecasts, margins, profitability, invoices, or financial performance? What were you responsible for?";
    case "leadership_or_people_management":
      return "Have you led teams, trained staff, coordinated contributors, or managed cross-functional stakeholders? What did you lead?";
    case "operations_or_process":
      return "Have you improved operations, built systems, standardized processes, reduced errors, or made work more repeatable? What changed?";
    case "creative_or_content":
      return "Have you created campaigns, brand content, social media, video, design briefs, messaging, or creative assets? What channels or audiences were involved?";
    case "research_or_strategy":
      return "Have you researched customers, competitors, markets, users, or performance trends to guide decisions? What insight did you produce?";
    case "compliance_or_quality":
      return "Have you reviewed work for accuracy, compliance, brand standards, safety, quality, or policy alignment? What did you check?";
    case "physical_or_field_work":
      return "Have you performed hands-on, field, trade, installation, repair, inspection, or site-based work? What type of work did you do?";
    case "soft_trait":
      return "Have you managed timelines, follow-ups, documentation, or multi-step workflows where reliability mattered? What did you keep on track?";
    default:
      return "";
  }
}

function evidenceNeededForIntent(intent: RequirementIntent, text: string): string {
  const evidence: Record<RequirementIntent, string> = {
    credential_or_license: "Current credential, license, certification, issuing body, and valid region if applicable.",
    education: "Education, training, certification, or equivalent experience that supports the requirement.",
    years_experience: "Relevant years and the roles that demonstrate them.",
    tool_or_platform: `Professional use of ${extractTool(text)} with context and proficiency.`,
    technical_skill: "Work built, maintained, analyzed, repaired, configured, or supported.",
    domain_experience: "Industry, customer, product, regulatory, or workflow context.",
    workflow_experience: "Repeatable workflows, handoffs, records, documentation, or follow-up systems managed.",
    project_management: "Projects, timelines, deliverables, stakeholders, vendors, or outcomes owned.",
    customer_or_client_management: "Customers or clients supported, onboarded, trained, retained, or guided.",
    sales_or_pipeline: "Leads, outreach, CRM, pipeline, renewals, follow-ups, or sales process evidence.",
    communication: "Audience, communication format, purpose, and outcome.",
    writing_or_documentation: "Content or documentation produced, audience, purpose, and quality/result.",
    analytics_or_reporting: "Reports, dashboards, KPIs, spreadsheets, recommendations, or decisions supported.",
    financial_or_budgeting: "Budgets, costs, forecasts, pricing, margins, invoices, revenue, or profitability handled.",
    leadership_or_people_management: "People, teams, contributors, training, coordination, or accountability led.",
    operations_or_process: "Process or system improved, standardized, made repeatable, or made more accurate.",
    creative_or_content: "Campaigns, brand content, channels, audiences, assets, or launches supported.",
    research_or_strategy: "Research source, insight produced, decision influenced, or strategy shaped.",
    compliance_or_quality: "Checks for accuracy, policy, brand, quality, safety, compliance, or risk.",
    physical_or_field_work: "Hands-on site, trade, installation, repair, maintenance, inspection, or field work.",
    soft_trait: "Observable workflow, follow-up, documentation, accuracy, or coordination evidence.",
    company_mission: "",
    metadata: "",
    ignore: ""
  };
  return evidence[intent];
}

function reasonForIntent(intent: RequirementIntent, text: string): string {
  if (intent === "tool_or_platform" && hasMetaAdsPlatformSignal(text)) {
    return "This is listed as a must-have skill, so we should confirm whether you have direct or adjacent Meta advertising experience before writing the final resume.";
  }
  if (intent === "education") {
    return "ATS systems and recruiters usually expect education entries to include clear education, training, or equivalent experience evidence.";
  }
  if (intent === "sales_or_pipeline" && /\bcrm\b/i.test(text)) {
    return "This role requires clean client documentation and follow-up tracking, so CRM or spreadsheet-based workflow evidence would be useful.";
  }
  if (intent === "communication") {
    return "This role involves client communication, updates, troubleshooting, or follow-through, so a concrete communication example can strengthen the resume.";
  }
  const reasons: Record<RequirementIntent, string> = {
    credential_or_license: "This is a hard credential or license signal, so we need direct confirmation.",
    education: "The posting asks for education, training, or equivalent experience. We need the strongest accurate evidence.",
    years_experience: "The posting names an experience level. We need the roles that best prove it.",
    tool_or_platform: "The posting names a tool or system. We need accurate professional usage, not guessed keywords.",
    technical_skill: "The posting asks for a practical skill. A concrete example helps prove it.",
    domain_experience: "The posting asks for domain context. We need the industry or workflow evidence behind it.",
    workflow_experience: "The posting points to repeatable work, follow-up, or organization. A real workflow example can prove it.",
    project_management: "The posting points to project ownership. A concrete example can show scope and accountability.",
    customer_or_client_management: "The posting needs customer or client evidence. A real example makes that credible.",
    sales_or_pipeline: "The posting points to sales, outreach, or pipeline work. We need the process or system you used.",
    communication: "The posting values communication. We need observable communication work, not a personality claim.",
    writing_or_documentation: "The posting asks for written materials or documentation. A concrete example can strengthen the resume.",
    analytics_or_reporting: "The posting asks for data, reporting, or insight work. We need the decision or outcome it supported.",
    financial_or_budgeting: "The posting points to financial responsibility. A concrete example can show judgment and scope.",
    leadership_or_people_management: "The posting points to leadership. We need what you led and who depended on it.",
    operations_or_process: "The posting points to process improvement. A before-and-after example can strengthen the resume.",
    creative_or_content: "The posting points to content or campaign work. A real channel, audience, or deliverable helps.",
    research_or_strategy: "The posting points to insight or strategy. We need what you learned and how it was used.",
    compliance_or_quality: "The posting points to accuracy or standards. A review or quality example can prove it.",
    physical_or_field_work: "The posting asks for hands-on work. Transferable office experience cannot replace this if required.",
    soft_trait: "We translate personality language into observable work evidence.",
    company_mission: "Company mission copy is not a candidate requirement.",
    metadata: "Job metadata is not a candidate requirement.",
    ignore: "This item is not useful for a candidate question."
  };
  return reasons[intent];
}

function suppressionReasonFor(
  type: JobAdItemType,
  intent: RequirementIntent,
  confidence: number
): string | undefined {
  if (confidence < MIN_QUESTION_CONFIDENCE) {
    return `Intent confidence ${confidence.toFixed(2)} is below ${MIN_QUESTION_CONFIDENCE}.`;
  }
  if (!isConcreteQuestionIntent(intent)) {
    return `Excluded as ${intent}.`;
  }
  if (["company_mission", "company_values", "company_description", "product_description", "employer_context", "marketing_copy", "benefits", "diversity_statement", "application_instruction", "location", "salary", "unknown_ignore"].includes(type)) {
    return `Excluded as ${type}.`;
  }
  return undefined;
}

function confidenceForIntent(base: number, intent: RequirementIntent): number {
  if (!isConcreteQuestionIntent(intent)) return base;
  if (intent === "soft_trait") return Math.min(base, 0.78);
  return Math.max(base, 0.78);
}

function extractTool(text: string): string {
  if (hasMetaAdsPlatformSignal(text)) return canonicalPlatformLabel("meta_ads_platform");
  const tools = text.match(/\b(Excel|PowerPoint|Office 365|Microsoft Office|Google Workspace|CRM|Salesforce|HubSpot|Mailchimp|Marketo|Tableau|Power BI|SQL|Python|QuickBooks|Jira|Asana|Workday|SAP|Oracle)\b/i);
  if (tools?.[0]) return tools[0];
  return "the tool or platform mentioned";
}

function credentialName(text: string): string {
  const lowered = text.toLowerCase();
  if (/\bplumb/.test(lowered)) return "plumbing license or certification";
  if (/\bdriver/.test(lowered)) return "driver's license";
  if (/\bred seal\b/.test(lowered)) return "Red Seal or trade credential";
  if (/\bcertification\b/.test(lowered)) return "certification";
  if (/\blicen[cs]e\b/.test(lowered)) return "license";
  return "license, certification, or credential";
}

function fieldName(text: string): string {
  const lowered = text.toLowerCase();
  if (/\bmarketing\b/.test(lowered)) return "marketing";
  if (/\bsales\b/.test(lowered)) return "sales";
  if (/\bcustomer|client|account\b/.test(lowered)) return "customer or client-facing work";
  if (/\banalytics|reporting|data\b/.test(lowered)) return "analytics or reporting";
  if (/\bplumb|trade|construction\b/.test(lowered)) return "the required trade or field";
  return "the required function";
}

function technicalSkillName(text: string): string {
  const lowered = text.toLowerCase();
  if (/\btroubleshoot/.test(lowered)) return "troubleshooting";
  if (/\bplumb|pipe|install|repair/.test(lowered)) return "the hands-on technical skill mentioned";
  if (/\bsoftware|system|platform/.test(lowered)) return "the technical system or platform mentioned";
  return "this technical skill";
}

function domainName(text: string): string {
  const lowered = text.toLowerCase();
  const domains = [
    "insurance",
    "finance",
    "healthcare",
    "SaaS",
    "retail",
    "construction",
    "manufacturing",
    "hospitality",
    "nonprofit",
    "fundraising",
    "real estate",
    "mortgage"
  ];
  const found = domains.find((domain) => lowered.includes(domain.toLowerCase()));
  return found ? `${found} or a similar domain` : "this industry or domain";
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/^[\u2022*\-–—\d.)\s]+/, "").trim();
}

function normalizeKey(text: string): string {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function shortTitle(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}
