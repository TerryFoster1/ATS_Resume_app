export type TransferableSkillSignal = {
  source: string;
  mapsTo: string;
  why: string;
  recruiterLanguage: string;
  evidenceExamples: string[];
  adjacentCareers: string[];
  recruiterConcern?: string;
  confidence: "strong" | "moderate" | "exploratory";
};

export type DiscoveryInsight = {
  theme: string;
  interpretation: string;
  possibleDirections: string[];
};

export type TransitionRecommendation = {
  title: string;
  category: "easiest" | "fastest" | "highest-income" | "lowest-risk";
  whyRealistic: string;
  transferableEvidence: string[];
  likelyGap: string;
  firstMove: string;
};

const TRANSITION_PATTERNS: Array<{
  pattern: RegExp;
  source: string;
  mapsTo: string;
  why: string;
  recruiterLanguage: string;
  evidenceExamples: string[];
  recruiterConcern?: string;
  directions: string[];
  confidence: TransferableSkillSignal["confidence"];
}> = [
  {
    pattern: /\b(chef|cook|kitchen|sous|line cook|restaurant manager|food service)\b/i,
    source: "Chef, kitchen, or food-service experience",
    mapsTo: "operations management, inventory control, vendor coordination, workforce scheduling, staff training, quality control, and process optimization",
    why: "Kitchen work often contains real operations responsibility: sequencing work, protecting standards, managing inventory constraints, coordinating suppliers, training staff, and making fast tradeoff decisions under pressure.",
    recruiterLanguage:
      "Coordinated daily operations, inventory planning, staff scheduling, supplier communication, quality control, and high-pressure workflow execution.",
    evidenceExamples: [
      "ordering or tracking ingredients, equipment, or stock",
      "building prep lists, shift plans, or service handoffs",
      "training new staff or maintaining quality standards",
      "solving service issues without interrupting customer experience"
    ],
    recruiterConcern:
      "Hiring teams may still need proof that this was repeatable operational ownership, not only task execution during busy service.",
    directions: ["Operations coordinator", "Project coordinator", "Food operations", "Vendor coordinator"],
    confidence: "strong"
  },
  {
    pattern: /\b(hospitality|server|barista|hotel|front desk|guest|concierge|event staff|restaurant)\b/i,
    source: "Hospitality or guest-facing service experience",
    mapsTo: "client management, service delivery, stakeholder communication, escalation handling, and account support",
    why: "Hospitality work can show relationship management, service recovery, expectation-setting, prioritization, and calm communication with people who need immediate help.",
    recruiterLanguage:
      "Managed guest expectations, resolved service issues, coordinated handoffs, protected service standards, and maintained trust in time-sensitive environments.",
    evidenceExamples: [
      "handling guest complaints or special requests",
      "coordinating between kitchen, service, and management",
      "maintaining service standards during high-volume periods",
      "following up so guests, teams, or managers had what they needed"
    ],
    recruiterConcern:
      "Recruiters may ask whether the experience involved ongoing relationship ownership or mostly short one-time interactions.",
    directions: ["Account coordinator", "Customer success associate", "Service operations"],
    confidence: "strong"
  },
  {
    pattern: /\b(retail|store|cashier|sales associate|shift lead|customer service|merchandising|store manager|assistant manager)\b/i,
    source: "Retail or customer-service experience",
    mapsTo: "customer success, onboarding, conflict resolution, account management, coaching, KPI awareness, and team coordination",
    why: "Retail work can demonstrate customer retention, objection handling, service recovery, coaching, merchandising decisions, and performance accountability when framed through business outcomes.",
    recruiterLanguage:
      "Supported customer retention, coached team members, handled escalations, tracked store or service goals, and turned customer needs into practical next steps.",
    evidenceExamples: [
      "de-escalating customer problems",
      "training or coaching team members",
      "tracking sales, service, shrink, merchandising, or conversion goals",
      "building repeat trust with customers or local accounts"
    ],
    recruiterConcern:
      "Recruiters may look for clearer evidence of account ownership, CRM habits, reporting, or business-to-business communication.",
    directions: ["Customer success", "Account management", "Sales operations", "Client support"],
    confidence: "strong"
  },
  {
    pattern: /\b(journalism|reporter|editor|writer|content|communications|newsletter|copy)\b/i,
    source: "Writing, journalism, or communications experience",
    mapsTo: "content strategy, marketing communication, audience research, stakeholder messaging, and deadline-driven execution",
    why: "This work usually requires audience judgment, research, narrative clarity, editing discipline, and fast synthesis.",
    recruiterLanguage:
      "Researched audience needs, interviewed stakeholders, synthesized complex information, shaped messaging, edited for clarity, and delivered under deadline.",
    evidenceExamples: [
      "interviewing sources or subject-matter experts",
      "turning research into clear public-facing content",
      "working to editorial calendars or tight deadlines",
      "adapting message and tone for different audiences"
    ],
    recruiterConcern:
      "Hiring teams may ask for proof of business outcomes, campaign context, channel performance, or cross-functional collaboration.",
    directions: ["Content marketing", "Communications specialist", "Marketing coordinator", "Research assistant"],
    confidence: "strong"
  },
  {
    pattern: /\b(trade|trades|construction|electrician|plumber|carpenter|mechanic|technician|foreman|site)\b/i,
    source: "Trades or field experience",
    mapsTo: "project coordination, vendor management, scheduling, quality assurance, safety compliance, and stakeholder updates",
    why: "Field work often involves sequencing tasks, managing constraints, coordinating materials or vendors, communicating issues, and keeping practical work moving despite site-level surprises.",
    recruiterLanguage:
      "Coordinated field work, sequenced tasks, communicated constraints, protected safety and quality standards, and kept projects moving across changing conditions.",
    evidenceExamples: [
      "sequencing tasks or coordinating crews",
      "flagging blockers before they affected timelines",
      "communicating with clients, vendors, inspectors, or supervisors",
      "maintaining safety, quality, or compliance standards"
    ],
    recruiterConcern:
      "The transition usually requires translating hands-on execution into coordination, documentation, and stakeholder-management examples.",
    directions: ["Project coordinator", "Operations coordinator", "Field operations", "Quality coordinator"],
    confidence: "strong"
  },
  {
    pattern: /\b(teacher|tutor|coach|training|classroom|education|mentor)\b/i,
    source: "Teaching, coaching, or mentoring experience",
    mapsTo: "onboarding, enablement, stakeholder communication, needs assessment, and structured explanation",
    why: "Teaching and coaching require diagnosing understanding, adapting communication, organizing information, and helping people improve.",
    recruiterLanguage:
      "Assessed needs, explained complex material clearly, adapted communication styles, coached progress, and structured learning or onboarding moments.",
    evidenceExamples: [
      "teaching a difficult concept in simpler language",
      "building lesson plans, practice material, or training steps",
      "coaching someone through improvement",
      "communicating progress to parents, stakeholders, or leaders"
    ],
    recruiterConcern:
      "Recruiters may want examples tied to business users, customers, metrics, or adult stakeholders.",
    directions: ["Customer enablement", "Learning coordinator", "Customer success", "Training coordinator"],
    confidence: "strong"
  },
  {
    pattern: /\b(admin|administrative assistant|office manager|reception|coordinator|office support|executive assistant)\b/i,
    source: "Administrative, office, or coordination experience",
    mapsTo: "operations coordination, stakeholder follow-up, process documentation, calendar management, prioritization, and internal service delivery",
    why: "Administrative work often contains the exact coordination layer employers need: keeping people organized, protecting deadlines, handling requests, documenting details, and making sure nothing important gets lost.",
    recruiterLanguage:
      "Coordinated schedules, managed requests, organized documentation, supported stakeholders, prioritized competing needs, and kept operational details moving.",
    evidenceExamples: [
      "managing calendars, requests, files, or office workflows",
      "following up with internal or external stakeholders",
      "documenting processes, notes, or next steps",
      "prioritizing competing tasks without losing service quality"
    ],
    recruiterConcern:
      "Hiring teams may want proof that the work involved judgment, prioritization, and cross-functional follow-through rather than only task completion.",
    directions: ["Operations coordinator", "Project coordinator", "Customer operations", "Executive assistant"],
    confidence: "strong"
  },
  {
    pattern: /\b(social media|community manager|creator|instagram|tiktok|facebook|content creator|online community)\b/i,
    source: "Social media, creator, or community experience",
    mapsTo: "digital marketing, audience engagement, community operations, content coordination, customer listening, and campaign support",
    why: "Community and social work can show audience judgment, message testing, engagement patterns, moderation, content planning, and the ability to translate feedback into action.",
    recruiterLanguage:
      "Managed audience engagement, coordinated content, interpreted community feedback, adapted messaging, and supported digital communication workflows.",
    evidenceExamples: [
      "planning posts, content calendars, or community updates",
      "responding to comments, messages, or audience concerns",
      "tracking engagement signals or recurring themes",
      "building trust with an online audience or customer community"
    ],
    recruiterConcern:
      "Recruiters may ask whether the work connects to business goals, audience outcomes, channel performance, or stakeholder expectations.",
    directions: ["Digital marketing coordinator", "Customer engagement coordinator", "Community operations", "Content marketing assistant"],
    confidence: "moderate"
  },
  {
    pattern: /\b(club|sports?|team captain|volunteer|community|fundraiser|student council|school event|side hustle|family business)\b/i,
    source: "School, community, volunteer, sports, or side-project experience",
    mapsTo: "early leadership, coordination, service orientation, accountability, and initiative",
    why: "Early-career evidence often sits outside paid jobs. Organizing people, serving a community, helping a family business, competing on teams, or finishing self-directed projects can still show responsibility and follow-through.",
    recruiterLanguage:
      "Demonstrated initiative, reliability, teamwork, event coordination, service orientation, and accountability through school, community, team, or project experience.",
    evidenceExamples: [
      "organizing an event, fundraiser, club, or team activity",
      "being trusted to lead, mentor, open, close, or coordinate",
      "building a project, side hustle, portfolio, or online community",
      "helping customers, family business tasks, teammates, or community members"
    ],
    recruiterConcern:
      "Recruiters will need the evidence framed professionally without overstating the scope or inventing formal job titles.",
    directions: ["First resume", "Customer support", "Administrative assistant", "Program assistant"],
    confidence: "moderate"
  }
];

export function inferTransferableSkillSignals(text: string, targetRole?: string | null): TransferableSkillSignal[] {
  const combined = `${text}\n${targetRole ?? ""}`;
  const matches = TRANSITION_PATTERNS
    .filter((pattern) => pattern.pattern.test(combined))
    .map(({ source, mapsTo, why, recruiterLanguage, evidenceExamples, recruiterConcern, directions, confidence }) => ({
      source,
      mapsTo,
      why,
      recruiterLanguage,
      evidenceExamples,
      adjacentCareers: directions,
      recruiterConcern,
      confidence
    }));
  if (matches.length) return matches.slice(0, 3);
  return [
    {
      source: "General career evidence",
      mapsTo: "communication, ownership, problem solving, follow-through, and learning agility",
      why: "Most career transitions become more credible when the user can point to real examples of responsibility, judgment, service, and measurable improvement.",
      recruiterLanguage:
        "Built trust, followed through on responsibilities, solved practical problems, communicated clearly, and learned new workflows.",
      evidenceExamples: [
        "times someone trusted you with responsibility",
        "moments you solved a problem under pressure",
        "examples of helping people, organizing work, or improving a process"
      ],
      adjacentCareers: ["customer support", "operations support", "administrative coordination"],
      recruiterConcern:
        "Recruiters will still need concrete examples rather than broad claims.",
      confidence: "exploratory"
    }
  ];
}

export function explainSkillMapping(signal: TransferableSkillSignal): string {
  return `${signal.source} may support ${signal.mapsTo} because ${signal.why.toLowerCase()} Use evidence like ${signal.evidenceExamples.slice(0, 2).join(" or ")} before relying on this heavily.`;
}

export function buildRecruiterConcernNotes(signals: TransferableSkillSignal[], targetRole?: string | null): string[] {
  const notes = signals
    .map((signal) => signal.recruiterConcern)
    .filter((value): value is string => Boolean(value));
  if (targetRole) {
    notes.unshift(`For ${targetRole}, recruiters will care less about the old title and more about whether the evidence proves similar responsibility, tools, pace, customers, outcomes, and judgment under realistic constraints.`);
  }
  return [...new Set(notes)].slice(0, 4);
}

export function inferTransitionRecommendations(text: string): TransitionRecommendation[] {
  const signals = inferTransferableSkillSignals(text);
  const primary = signals[0];
  const recommendations: TransitionRecommendation[] = [];

  for (const career of primary.adjacentCareers.slice(0, 4)) {
    const lower = career.toLowerCase();
    const category: TransitionRecommendation["category"] =
      /support|assistant|coordinator/.test(lower)
        ? "lowest-risk"
        : /operations|customer success|project/.test(lower)
          ? "fastest"
          : /account|sales/.test(lower)
            ? "highest-income"
            : "easiest";
    recommendations.push({
      title: career,
      category,
      whyRealistic: `${career} can be realistic if the user proves ${primary.mapsTo} with grounded examples. The strongest case starts with what they already did, then translates it into the responsibility language this role uses.`,
      transferableEvidence: primary.evidenceExamples.slice(0, 3),
      likelyGap: primary.recruiterConcern ?? "The likely gap is translating real work into role-specific proof.",
      firstMove: `Rewrite two examples using this language: ${primary.recruiterLanguage} Then prepare the evidence behind each phrase so it sounds like lived experience, not keyword substitution.`
    });
  }

  return recommendations;
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
        "You may do well in work where trust, communication, service recovery, or explanation matter. Recruiters will want proof that people relied on you, not just that you like helping.",
      possibleDirections: ["customer success", "account support", "training", "community operations"]
    });
  }
  if (/\b(organize|plan|schedule|coordinate|process|systems?|operations|details|logistics)\b/.test(text)) {
    insights.push({
      theme: "Operational pattern",
      interpretation:
        "You may have a coordination or operations pattern: making work clearer, sequenced, and less chaotic. This can become a real career signal when tied to deadlines, handoffs, standards, or outcomes.",
      possibleDirections: ["operations coordinator", "project coordinator", "program assistant"]
    });
  }
  if (/\b(write|research|content|story|explain|analy|data|strategy|marketing)\b/.test(text)) {
    insights.push({
      theme: "Analytical communication",
      interpretation:
        "You may be drawn to work that turns information into decisions, messaging, or clearer strategy. The hiring question is whether you can connect the communication to an audience, business goal, or stakeholder need.",
      possibleDirections: ["content marketing", "communications", "business analyst", "research"]
    });
  }
  if (/\b(remote|flex|balance|stress|burn|calm|stable|predictable)\b/.test(text)) {
    insights.push({
      theme: "Work-environment fit",
      interpretation:
        "Your next move may need to optimize for sustainability, not just a better title. A realistic path should respect energy, schedule, stress, and learning capacity.",
      possibleDirections: ["structured operations", "support enablement", "remote-friendly coordinator roles"]
    });
  }
  if (/\b(pay|salary|income|growth|advance|lead|manager|promotion|ambition)\b/.test(text)) {
    insights.push({
      theme: "Progression motive",
      interpretation:
        "Career growth may matter as much as role fit. Look for paths with visible promotion ladders, skill compounding, and evidence recruiters can understand quickly.",
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



