export type TransferableSkillSignal = {
  source: string;
  mapsTo: string;
  why: string;
  recruiterConcern?: string;
};

export type DiscoveryInsight = {
  theme: string;
  interpretation: string;
  possibleDirections: string[];
};

const TRANSITION_PATTERNS: Array<{
  pattern: RegExp;
  source: string;
  mapsTo: string;
  why: string;
  recruiterConcern?: string;
  directions: string[];
}> = [
  {
    pattern: /\b(chef|cook|kitchen|restaurant|hospitality|server|barista|hotel|front desk|guest)\b/i,
    source: "Hospitality or kitchen experience",
    mapsTo: "operations, service recovery, workflow coordination, quality control, and team communication",
    why: "Service environments often require prioritizing under pressure, coordinating handoffs, protecting standards, and solving customer or workflow issues in real time.",
    recruiterConcern:
      "Hiring teams may still need proof that you can describe those responsibilities in business, operations, or client-facing language.",
    directions: ["Operations coordinator", "Customer success associate", "Account coordinator"]
  },
  {
    pattern: /\b(retail|store|cashier|sales associate|shift lead|customer service|merchandising)\b/i,
    source: "Retail or customer-service experience",
    mapsTo: "customer success, account support, retention, escalation handling, and team coordination",
    why: "Retail work can show relationship management, service recovery, coaching, prioritization, and follow-through with measurable customer outcomes.",
    recruiterConcern:
      "Recruiters may look for clearer evidence of account ownership, CRM habits, reporting, or business-to-business communication.",
    directions: ["Customer success", "Account management", "Sales operations"]
  },
  {
    pattern: /\b(journalism|reporter|editor|writer|content|communications|newsletter|copy)\b/i,
    source: "Writing, journalism, or communications experience",
    mapsTo: "content strategy, marketing communication, audience research, stakeholder messaging, and deadline-driven execution",
    why: "This work usually requires audience judgment, research, narrative clarity, editing discipline, and fast synthesis.",
    recruiterConcern:
      "Hiring teams may ask for proof of business outcomes, campaign context, channel performance, or cross-functional collaboration.",
    directions: ["Content marketing", "Communications specialist", "Marketing coordinator"]
  },
  {
    pattern: /\b(trade|trades|construction|electrician|plumber|carpenter|mechanic|technician|foreman|site)\b/i,
    source: "Trades or field experience",
    mapsTo: "project coordination, scheduling, quality assurance, safety compliance, and stakeholder updates",
    why: "Field work often involves sequencing tasks, managing constraints, communicating issues, and keeping practical work moving.",
    recruiterConcern:
      "The transition usually requires translating hands-on execution into coordination, documentation, and stakeholder-management examples.",
    directions: ["Project coordinator", "Operations coordinator", "Field operations"]
  },
  {
    pattern: /\b(teacher|tutor|coach|training|classroom|education|mentor)\b/i,
    source: "Teaching, coaching, or mentoring experience",
    mapsTo: "onboarding, enablement, stakeholder communication, needs assessment, and structured explanation",
    why: "Teaching and coaching require diagnosing understanding, adapting communication, organizing information, and helping people improve.",
    recruiterConcern:
      "Recruiters may want examples tied to business users, customers, metrics, or adult stakeholders.",
    directions: ["Customer enablement", "Learning coordinator", "Customer success"]
  }
];

export function inferTransferableSkillSignals(text: string, targetRole?: string | null): TransferableSkillSignal[] {
  const combined = `${text}\n${targetRole ?? ""}`;
  const matches = TRANSITION_PATTERNS
    .filter((pattern) => pattern.pattern.test(combined))
    .map(({ source, mapsTo, why, recruiterConcern }) => ({
      source,
      mapsTo,
      why,
      recruiterConcern
    }));
  if (matches.length) return matches.slice(0, 3);
  return [
    {
      source: "General career evidence",
      mapsTo: "communication, ownership, problem solving, follow-through, and learning agility",
      why: "Most career transitions become more credible when the user can point to real examples of responsibility, judgment, service, and measurable improvement.",
      recruiterConcern:
        "Recruiters will still need concrete examples rather than broad claims."
    }
  ];
}

export function inferDiscoveryInsights(input: {
  interests?: string;
  strengths?: string;
  preferences?: string;
  energy?: string;
  ambition?: string;
}) {
  const text = Object.values(input).filter(Boolean).join("\n").toLowerCase();
  const insights: DiscoveryInsight[] = [];

  if (/\b(help|people|customer|client|support|teach|coach|mentor|community)\b/.test(text)) {
    insights.push({
      theme: "Relational strength",
      interpretation:
        "You may do well in work where trust, communication, service recovery, or explanation matter.",
      possibleDirections: ["customer success", "account support", "training", "community operations"]
    });
  }
  if (/\b(organize|plan|schedule|coordinate|process|systems?|operations|details|logistics)\b/.test(text)) {
    insights.push({
      theme: "Operational pattern",
      interpretation:
        "You may have a coordination or operations pattern: making work clearer, sequenced, and less chaotic.",
      possibleDirections: ["operations coordinator", "project coordinator", "program assistant"]
    });
  }
  if (/\b(write|research|content|story|explain|analy|data|strategy|marketing)\b/.test(text)) {
    insights.push({
      theme: "Analytical communication",
      interpretation:
        "You may be drawn to work that turns information into decisions, messaging, or clearer strategy.",
      possibleDirections: ["content marketing", "communications", "business analyst", "research"]
    });
  }
  if (/\b(remote|flex|balance|stress|burn|calm|stable|predictable)\b/.test(text)) {
    insights.push({
      theme: "Work-environment fit",
      interpretation:
        "Your next move may need to optimize for sustainability, not just a better title.",
      possibleDirections: ["structured operations", "support enablement", "remote-friendly coordinator roles"]
    });
  }
  if (/\b(pay|salary|income|growth|advance|lead|manager|promotion|ambition)\b/.test(text)) {
    insights.push({
      theme: "Progression motive",
      interpretation:
        "Career growth may matter as much as role fit. Look for paths with visible promotion ladders and skill compounding.",
      possibleDirections: ["customer success", "project coordination", "sales operations", "account management"]
    });
  }

  return insights.slice(0, 4);
}

export function recommendLowCostLearning(targetRole: string, gaps: string[] = []) {
  const text = `${targetRole} ${gaps.join(" ")}`.toLowerCase();
  const recommendations = new Set<string>();
  if (/\b(crm|salesforce|account|customer success|sales)\b/.test(text)) {
    recommendations.add("Salesforce Trailhead for CRM familiarity and account terminology");
    recommendations.add("HubSpot Academy for customer-facing funnel and CRM basics");
  }
  if (/\b(project|agile|scrum|operations|coordinator|program)\b/.test(text)) {
    recommendations.add("Microsoft Learn or free project templates to practice status updates, timelines, and stakeholder notes");
    recommendations.add("Intro Agile or CAPM-aligned resources if project coordination is a repeated gap");
  }
  if (/\b(marketing|content|analytics|campaign|social)\b/.test(text)) {
    recommendations.add("Google Analytics or HubSpot Academy basics for campaign and reporting language");
    recommendations.add("Build one small portfolio example that shows audience, message, channel, and result");
  }
  if (!recommendations.size) {
    recommendations.add("Start with role terminology, one practical portfolio example, and recruiter-style interview practice before paying for courses.");
  }
  return [...recommendations].slice(0, 3);
}
